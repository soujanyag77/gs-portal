import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getUploadedFile, getFileBuffer } from '@/lib/files-service';

export const dynamic = 'force-dynamic';

function getMimeType(fileName: string, dbMime?: string): string {
  if (dbMime && dbMime !== 'application/octet-stream') {
    if (dbMime === 'text/html') return 'text/html; charset=utf-8';
    if (dbMime === 'text/plain') return 'text/plain; charset=utf-8';
    return dbMime;
  }

  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.xml': 'application/xml',
    '.csv': 'text/csv; charset=utf-8',
  };

  return mimeMap[ext] || dbMime || 'application/octet-stream';
}

/**
 * GET /api/files/view/[id] - Stream file with Content-Disposition: inline and dynamic Content-Type
 * for in-tab preview (PDFs, HTML, Images, Video, Audio, Plain Text)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fileId = params.id;

  try {
    const file = await getUploadedFile(fileId);
    if (!file) {
      return new NextResponse('File record not found', { status: 404 });
    }

    const buffer = await getFileBuffer(file);
    if (!buffer) {
      return new NextResponse('File content not found in storage', { status: 404 });
    }

    const contentType = getMimeType(file.file_name, file.mime_type);
    const ext = path.extname(file.file_name).toLowerCase();
    const encodedFileName = encodeURIComponent(file.file_name);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    };

    // For HTML, omitting Content-Disposition ensures clean interactive rendering in tab
    if (!['.html', '.htm'].includes(ext)) {
      headers['Content-Disposition'] = `inline; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`;
    }

    // Support video/audio range streaming if Range header present
    const rangeHeader = req.headers.get('range');
    if (rangeHeader && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const fileSize = buffer.length;
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const chunk = buffer.subarray(start, end + 1);

      return new NextResponse(chunk as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    return new NextResponse(buffer as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('GET /api/files/view/[id] error:', err);
    return new NextResponse('Error viewing file: ' + (err.message || 'Server error'), {
      status: 500,
    });
  }
}
