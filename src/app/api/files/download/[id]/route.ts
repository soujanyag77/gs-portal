import { NextRequest, NextResponse } from 'next/server';
import { getUploadedFile, getFileBuffer } from '@/lib/files-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/files/download/[id] - Stream file with Content-Disposition: attachment
 * to force download while preserving original filename and extension
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

    const encodedFileName = encodeURIComponent(file.file_name);
    const contentType = file.mime_type || 'application/octet-stream';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      // Standard RFC 5987 / RFC 6266 attachment disposition
      'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      'Cache-Control': 'no-cache',
    };

    return new NextResponse(buffer as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('GET /api/files/download/[id] error:', err);
    return new NextResponse('Error downloading file: ' + (err.message || 'Server error'), {
      status: 500,
    });
  }
}
