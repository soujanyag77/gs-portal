import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile } from '@/lib/files-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/files/upload - Upload file to Supabase storage ('portal-files') and database
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
    console.error('POST /api/files/upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Upload processing failed' },
      { status: 500 }
    );
  }
}
