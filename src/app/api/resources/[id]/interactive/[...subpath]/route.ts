import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUnpackedFilePath } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; subpath: string[] } }
) {
  const resourceId = params.id;
  const subPath = (params.subpath || []).join('/');

  const filePath = getUnpackedFilePath(resourceId, subPath);
  if (!filePath || !fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new NextResponse('Not a file', { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.html' || ext === '.htm') contentType = 'text/html';
  else if (ext === '.js') contentType = 'application/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';
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
