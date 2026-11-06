import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getResourceById, incrementResourceStat } from '@/lib/db';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resource = getResourceById(params.id);
  if (!resource) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Find file on disk: check for pattern resourceId_filename or stored filename
  let targetPath: string | null = null;
  const files = fs.readdirSync(UPLOADS_DIR);
  const matched = files.find((f) => f.startsWith(`${resource.id}_`));

  if (matched) {
    targetPath = path.join(UPLOADS_DIR, matched);
  } else {
    // Check fallback direct file_name
    const directPath = path.join(UPLOADS_DIR, resource.file_name);
    if (fs.existsSync(directPath)) {
      targetPath = directPath;
    }
  }

  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

  if (!targetPath || !fs.existsSync(targetPath)) {
    if (resource.file_url.startsWith('http')) {
      if (isDownload) {
        incrementResourceStat(resource.id, 'download');
      } else {
        incrementResourceStat(resource.id, 'view');
      }
      return NextResponse.redirect(resource.file_url);
    }
    return new NextResponse('File data missing on storage', { status: 404 });
  }

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;

  if (isDownload) {
    incrementResourceStat(resource.id, 'download');
  } else {
    incrementResourceStat(resource.id, 'view');
  }

  let contentType = resource.mime_type || 'application/octet-stream';
  const ext = path.extname(resource.file_name).toLowerCase();
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
  else if (['.html', '.htm'].includes(ext)) contentType = 'text/html';

  // Support HTTP range requests for audio / video
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

  // Full file stream
  const fileStream = fs.createReadStream(targetPath);
  const stream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
  });

  const disposition = isDownload
    ? `attachment; filename="${encodeURIComponent(resource.file_name)}"`
    : `inline; filename="${encodeURIComponent(resource.file_name)}"`;

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
