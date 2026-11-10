import { NextRequest, NextResponse } from 'next/server';
import { listUploadedFiles, saveUploadedFile } from '@/lib/files-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/files - List all uploaded files, sorted by newest first
 */
export async function GET() {
  try {
    const files = await listUploadedFiles();
    return NextResponse.json({ files });
  } catch (err: any) {
    console.error('GET /api/files error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list uploaded files' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files - Upload a file to Supabase storage ('portal-files') and record metadata
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'unnamed_file';
    const mimeType = file.type || 'application/octet-stream';
    const fileSize = file.size || buffer.length;

    const uploaded = await saveUploadedFile({
      fileName,
      mimeType,
      fileSize,
      buffer,
    });

    return NextResponse.json({ success: true, file: uploaded }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/files error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process file upload' },
      { status: 500 }
    );
  }
}
