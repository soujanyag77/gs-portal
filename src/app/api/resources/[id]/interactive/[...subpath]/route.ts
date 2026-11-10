import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUnpackedFilePath } from '@/lib/storage';
import { getResourceById } from '@/lib/data-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; subpath: string[] } }
) {
  const resourceId = params.id;
  const subPath = (params.subpath || []).join('/');

  const filePath = getUnpackedFilePath(resourceId, subPath);

  // If not found in unpacked directory, check if this resource exists as a standalone HTML upload
  if (!filePath || !fs.existsSync(filePath)) {
    try {
      const resource = await getResourceById(resourceId);
      if (resource) {
        return NextResponse.redirect(new URL(`/api/resources/${resourceId}/file`, req.url), 302);
      }
    } catch (e) {}
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new NextResponse('Not a file', { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.html' || ext === '.htm') contentType = 'text/html; charset=utf-8';
  else if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
  else if (ext === '.css') contentType = 'text/css; charset=utf-8';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.wav') contentType = 'audio/wav';

  const content = fs.readFileSync(filePath);
  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
