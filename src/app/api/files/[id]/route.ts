import { NextRequest, NextResponse } from 'next/server';
import { removeUploadedFile } from '@/lib/files-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/files/[id] - Remove file from Supabase storage ('portal-files') and database
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const fileId = params.id;

  try {
    const success = await removeUploadedFile(fileId);
    if (!success) {
      return NextResponse.json({ error: 'File not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: fileId });
  } catch (err: any) {
    console.error('DELETE /api/files/[id] error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
