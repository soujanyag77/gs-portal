import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { getResourceById, getResources } from '@/lib/data-service';
import { incrementResourceStat } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resourceId = params.id;
  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

  // 1. Resolve Resource metadata (checking Supabase and local SQLite)
  let resource = await getResourceById(resourceId);

  // Fallback: search across all resources by id, file_name, or file_url match
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

  // 2. If resource has a direct external HTTP URL (and not our own internal api URL)
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
          const ext = path.extname(resource.file_name).toLowerCase();
          const contentType = getMimeType(resource.file_name, resource.mime_type || blob.type);

          // If docx and viewing, render docx reader
          if (!isDownload && ext === '.docx') {
            const docxHtml = renderDocxReader(
              buffer,
              resource.title,
              resource.file_name,
              resource.class_name || 'Class',
              resource.subject_name || 'Subject',
              resource.unit_name || 'Unit',
              `/api/resources/${resource.id}/file?download=1`
            );
            if (docxHtml) {
              return new NextResponse(docxHtml, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            }
          }

          const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
          };

          if (isDownload) {
            headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(resource.file_name)}"`;
          } else if (['.html', '.htm'].includes(ext)) {
            // No attachment disposition for HTML so browsers render cleanly in new tab
          } else {
            headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(resource.file_name)}"`;
          }

          return new NextResponse(buffer, { status: 200, headers });
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

  // 5. If found on disk, stream or return buffer
  if (targetPath && fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;

    if (resource) {
      try {
        incrementResourceStat(resource.id, isDownload ? 'download' : 'view');
      } catch (e) {}
    }

    const ext = path.extname(detectedFileName).toLowerCase();
    const contentType = getMimeType(detectedFileName, resource?.mime_type);
    const downloadFileName = resource?.file_name || detectedFileName;

    // HTTP range request support for video/audio streaming
    const rangeHeader = req.headers.get('range');
    if (!isDownload && rangeHeader && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
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

    // Read full file buffer synchronously for maximum stability across platforms
    const fileBuffer = fs.readFileSync(targetPath);

    // If viewing a Word document (.docx) in new tab, render clean interactive reader
    if (!isDownload && ext === '.docx') {
      const docxHtml = renderDocxReader(
        fileBuffer,
        resource?.title || downloadFileName,
        downloadFileName,
        resource?.class_name || 'Classroom',
        resource?.subject_name || 'Subject',
        resource?.unit_name || 'Unit Study',
        `/api/resources/${resourceId}/file?download=1`
      );
      if (docxHtml) {
        return new NextResponse(docxHtml, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }
    }

    // Set headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    };

    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(downloadFileName)}"`;
    } else if (['.html', '.htm'].includes(ext)) {
      // For HTML, omit Content-Disposition so browser renders the page directly!
    } else {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(downloadFileName)}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  }

  // 6. Friendly kid-styled file preview screen if physical storage bytes are currently unattached
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
    .btn-row {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 16px;
      box-shadow: 0 5px 0 #0284c7;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #38bdf8;
      transform: translateY(-2px);
      box-shadow: 0 7px 0 #0284c7;
    }
    .btn-green {
      background: #10b981;
      box-shadow: 0 5px 0 #059669;
    }
    .btn-green:hover {
      background: #34d399;
      box-shadow: 0 7px 0 #059669;
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

    <div class="btn-row">
      <a href="/api/resources/${resourceId}/file?download=1" class="btn btn-green">📥 Download File</a>
      <a href="/student/portal" class="btn">Back to Portal 🚀</a>
    </div>
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

function getMimeType(fileName: string, fallbackMime?: string | null): string {
  const ext = path.extname(fileName).toLowerCase();
  if (['.html', '.htm'].includes(ext)) return 'text/html; charset=utf-8';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (['.txt', '.csv'].includes(ext)) return 'text/plain; charset=utf-8';
  return fallbackMime || 'application/octet-stream';
}

function renderDocxReader(
  buffer: Buffer,
  title: string,
  fileName: string,
  className: string,
  subjectName: string,
  unitName: string,
  downloadUrl: string
): string | null {
  try {
    const zip = new AdmZip(buffer);
    const xmlEntry = zip.getEntry('word/document.xml');
    if (!xmlEntry) return null;

    const xml = xmlEntry.getData().toString('utf8');
    const pMatches = xml.match(/<w:p[\s>].*?<\/w:p>/g) || [];
    const paragraphs: string[] = [];

    for (const p of pMatches) {
      const tMatches = p.match(/<w:t[\s>].*?<\/w:t>/g) || [];
      const line = tMatches
        .map((t) => t.replace(/<.*?>/g, ''))
        .join('')
        .trim();
      if (line) {
        paragraphs.push(line);
      }
    }

    if (paragraphs.length === 0) return null;

    const paragraphsHtml = paragraphs
      .map((p) => {
        if (p.length < 60 && !p.endsWith('.')) {
          return `<h2 style="font-size: 1.3rem; font-weight: 800; color: #1e293b; margin-top: 1.75rem; margin-bottom: 0.5rem;">${escapeHtml(p)}</h2>`;
        }
        return `<p style="font-size: 1.05rem; line-height: 1.8; color: #334155; margin-bottom: 1.1rem;">${escapeHtml(p)}</p>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} - Document Reader</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
    }
    .top-bar {
      position: sticky;
      top: 0;
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
      padding: 12px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-icon {
      font-size: 32px;
    }
    .file-meta h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
    }
    .file-meta span {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-download {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 4px 0 #059669;
    }
    .btn-download:hover {
      background: #059669;
      transform: translateY(-1px);
    }
    .btn-print {
      background: #e2e8f0;
      color: #334155;
    }
    .btn-print:hover {
      background: #cbd5e1;
    }
    .btn-portal {
      background: #38bdf8;
      color: #ffffff;
    }
    .btn-portal:hover {
      background: #0284c7;
    }
    .paper-container {
      max-width: 860px;
      margin: 36px auto;
      padding: 0 16px;
    }
    .paper {
      background: #ffffff;
      border-radius: 24px;
      padding: 56px 64px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      min-height: 80vh;
    }
    .doc-title {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
      padding-bottom: 18px;
      border-bottom: 2px solid #f1f5f9;
    }
    .doc-tag {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 12px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    @media print {
      .top-bar { display: none; }
      body { background: #ffffff; }
      .paper { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="file-info">
      <div class="file-icon">📝</div>
      <div class="file-meta">
        <h1>${escapeHtml(title)}</h1>
        <span>${escapeHtml(className)} • ${escapeHtml(subjectName)} • ${escapeHtml(fileName)}</span>
      </div>
    </div>
    <div class="btn-group">
      <a href="${downloadUrl}" class="btn btn-download">📥 Download Word File</a>
      <button onclick="window.print()" class="btn btn-print">🖨️ Print</button>
      <a href="/student/portal" class="btn btn-portal">🎒 Back to Portal</a>
    </div>
  </div>

  <div class="paper-container">
    <div class="paper">
      <div class="doc-tag">📖 ${escapeHtml(unitName)}</div>
      <h1 class="doc-title">${escapeHtml(title)}</h1>
      <div class="doc-content">
        ${paragraphsHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
  } catch (err) {
    console.warn('renderDocxReader error:', err);
    return null;
  }
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
