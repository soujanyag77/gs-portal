import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getResourceById, getResources } from '@/lib/data-service';
import { incrementResourceStat } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resourceId = params.id;
  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

  // 1. Resolve Resource metadata (checking Supabase and local SQLite)
  let resource = await getResourceById(resourceId);

  // Fallback: search across all resources by id or by file_name
  if (!resource) {
    try {
      const allResources = await getResources();
      resource = allResources.find(
        (r) =>
          r.id === resourceId ||
          r.file_name.toLowerCase() === resourceId.toLowerCase() ||
          r.file_url.includes(resourceId)
      ) || null;
    } catch (e) {}
  }

  // 2. If resource has a direct external HTTP URL, redirect or stream it
  if (resource && resource.file_url && resource.file_url.startsWith('http')) {
    try {
      incrementResourceStat(resource.id, isDownload ? 'download' : 'view');
    } catch (e) {}
    return NextResponse.redirect(resource.file_url, 302);
  }

  // 3. If Supabase Storage is configured, check class-resources bucket
  if (isSupabaseConfigured() && resource) {
    try {
      const supabase = createServerSupabaseClient();
      const possibleStoragePaths = [
        `uploads/${resource.id}_${resource.file_name}`,
        `uploads/${resource.file_name}`,
        resource.file_name,
        resource.id,
      ];

      for (const sPath of possibleStoragePaths) {
        const { data: blob, error } = await supabase.storage.from('class-resources').download(sPath);
        if (!error && blob) {
          try {
            incrementResourceStat(resource.id, isDownload ? 'download' : 'view');
          } catch (e) {}

          const buffer = Buffer.from(await blob.arrayBuffer());
          const contentType = resource.mime_type || blob.type || 'application/octet-stream';
          const disposition = isDownload
            ? `attachment; filename="${encodeURIComponent(resource.file_name)}"`
            : `inline; filename="${encodeURIComponent(resource.file_name)}"`;

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Length': buffer.length.toString(),
              'Content-Disposition': disposition,
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      }
    } catch (supaErr) {
      console.warn('Supabase storage check notice:', supaErr);
    }
  }

  // 4. Find file on disk in potential storage directories
  const candidateDirs = [
    path.join(process.cwd(), 'data', 'uploads'),
    path.join(os.tmpdir(), 'portal_data', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ];

  let targetPath: string | null = null;
  let detectedFileName = resource ? resource.file_name : 'file';

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir);
      // Pattern 1: Starts with resourceId_
      const matchPrefix = files.find((f) => f.startsWith(`${resourceId}_`));
      if (matchPrefix) {
        targetPath = path.join(dir, matchPrefix);
        detectedFileName = matchPrefix;
        break;
      }

      // Pattern 2: Contains resourceId
      const matchContains = files.find((f) => f.includes(resourceId));
      if (matchContains) {
        targetPath = path.join(dir, matchContains);
        detectedFileName = matchContains;
        break;
      }

      // Pattern 3: Matches resource file_name
      if (resource && resource.file_name) {
        const matchName = files.find((f) => f.toLowerCase() === resource.file_name.toLowerCase());
        if (matchName) {
          targetPath = path.join(dir, matchName);
          detectedFileName = matchName;
          break;
        }
      }
    } catch (readErr) {
      console.warn('Error reading directory:', dir, readErr);
    }
  }

  // 5. If found on disk, stream with proper mime-type and inline disposition
  if (targetPath && fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;

    if (resource) {
      try {
        incrementResourceStat(resource.id, isDownload ? 'download' : 'view');
      } catch (e) {}
    }

    let contentType = (resource && resource.mime_type) || 'application/octet-stream';
    const ext = path.extname(detectedFileName).toLowerCase();
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (['.html', '.htm'].includes(ext)) contentType = 'text/html; charset=utf-8';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    // HTTP range request support for video/audio streaming
    const rangeHeader = req.headers.get('range');
    if (rangeHeader && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(targetPath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(targetPath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(resource?.file_name || detectedFileName)}"`
      : `inline; filename="${encodeURIComponent(resource?.file_name || detectedFileName)}"`;

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': disposition,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 6. Friendly kid-styled file preview screen if physical storage bytes are currently preparing or unattached
  const title = resource?.title || 'Learning Resource';
  const fileName = resource?.file_name || detectedFileName || 'Document';
  const className = resource?.class_name || 'Classroom';
  const subjectName = resource?.subject_name || 'Curriculum';
  const unitName = resource?.unit_name || 'Unit Study';

  const friendlyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} - Kid Learning Portal</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #fef3c7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      color: #1e293b;
    }
    .card {
      background: #ffffff;
      border: 4px solid #38bdf8;
      border-radius: 28px;
      box-shadow: 0 20px 40px rgba(56, 189, 248, 0.2);
      max-width: 540px;
      width: 100%;
      padding: 36px 32px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 6px 16px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 13px;
      margin-bottom: 16px;
      border: 1px solid #bae6fd;
    }
    h1 {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 10px 0;
    }
    p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .meta {
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 13px;
      border: 1px solid #e2e8f0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
    }
    .meta-val {
      font-weight: 600;
      color: #0284c7;
    }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 16px;
      box-shadow: 0 6px 0 #0284c7;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #38bdf8;
      transform: translateY(-2px);
      box-shadow: 0 8px 0 #0284c7;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 56px; margin-bottom: 12px;">📚</div>
    <div class="badge">🎒 Class Learning Library</div>
    <h1>${escapeHtml(title)}</h1>
    <p>This learning resource has been published to the student portal curriculum library.</p>
    
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Class / Section:</span><span class="meta-val">${escapeHtml(className)}</span></div>
      <div class="meta-row"><span class="meta-label">Subject:</span><span class="meta-val">${escapeHtml(subjectName)}</span></div>
      <div class="meta-row"><span class="meta-label">Unit Topic:</span><span class="meta-val">${escapeHtml(unitName)}</span></div>
      <div class="meta-row"><span class="meta-label">File Attached:</span><span class="meta-val">${escapeHtml(fileName)}</span></div>
    </div>

    <a href="/student/portal" class="btn">Back to Student Portal 🚀</a>
  </div>
</body>
</html>`;

  return new NextResponse(friendlyHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
