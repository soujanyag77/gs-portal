import { NextRequest, NextResponse } from 'next/server';
import { getResourceById, updateResource, deleteResource } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { deleteStoredFile, saveUploadedFile } from '@/lib/storage';
import { detectFileType } from '@/lib/file-types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const resource = getResourceById(params.id);
  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }
  return NextResponse.json({ resource });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const existing = getResourceById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle multipart if replacing file
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string | null;
      const description = formData.get('description') as string | null;
      const unit_id = formData.get('unit_id') as string | null;

      let updateData: any = {};
      if (title) updateData.title = title.trim();
      if (description !== null) updateData.description = description.trim();
      if (unit_id) updateData.unit_id = unit_id;

      if (file && file.size > 0) {
        // Delete old file
        deleteStoredFile(existing.file_name, existing.id);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || 'application/octet-stream';
        const detectedType = detectFileType(file.name, mimeType);

        const storedInfo = await saveUploadedFile(buffer, file.name, existing.id, mimeType);

        updateData.file_name = file.name;
        updateData.file_type = detectedType;
        updateData.file_size = storedInfo.fileSize;
        updateData.mime_type = storedInfo.mimeType;
      }

      const updated = updateResource(params.id, updateData);
      return NextResponse.json({ success: true, resource: updated });
    } else {
      // JSON update for metadata
      const data = await req.json();
      const updated = updateResource(params.id, {
        title: data.title?.trim(),
        description: data.description !== undefined ? data.description?.trim() : undefined,
        unit_id: data.unit_id,
      });
      return NextResponse.json({ success: true, resource: updated });
    }
  } catch (error: any) {
    console.error('Update resource error:', error);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const existing = getResourceById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  // Delete stored file and unpacked folder
  deleteStoredFile(existing.file_name, existing.id);
  const success = deleteResource(params.id);

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Resource deleted successfully' });
}
