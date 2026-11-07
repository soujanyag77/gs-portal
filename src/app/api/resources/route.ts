import { NextRequest, NextResponse } from 'next/server';
import { getResources, addResource } from '@/lib/data-service';
import { getSessionUser } from '@/lib/auth';
import { detectFileType } from '@/lib/file-types';
import { saveUploadedFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const class_id = searchParams.get('class_id') || undefined;
    const subject_id = searchParams.get('subject_id') || undefined;
    const unit_id = searchParams.get('unit_id') || undefined;
    const file_type = searchParams.get('file_type') || undefined;
    const search = searchParams.get('search') || undefined;

    const resources = await getResources({ class_id, subject_id, unit_id, file_type, search });
    return NextResponse.json({ resources });
  } catch (error: any) {
    console.error('Failed to get resources:', error);
    return NextResponse.json({ resources: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const unit_id = formData.get('unit_id') as string | null;
    const title = formData.get('title') as string | null;
    const description = (formData.get('description') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'Please choose a file to upload.' }, { status: 400 });
    }
    if (!unit_id) {
      return NextResponse.json({ error: 'Please select a Unit/Topic for this file.' }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Please enter a title for this resource.' }, { status: 400 });
    }

    const resourceId = 'res_' + Math.random().toString(36).substring(2, 10);
    const originalFileName = file.name;
    const mimeType = file.type || 'application/octet-stream';
    const detectedType = detectFileType(originalFileName, mimeType);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storedInfo = await saveUploadedFile(buffer, originalFileName, resourceId, mimeType);

    const fileUrl = storedInfo.publicUrl || `/api/resources/${resourceId}/file`;

    const newResource = await addResource({
      id: resourceId,
      unit_id,
      title: title.trim(),
      description: description.trim(),
      file_url: fileUrl,
      file_name: originalFileName,
      file_type: detectedType,
      file_size: storedInfo.fileSize,
      mime_type: storedInfo.mimeType,
    });

    return NextResponse.json({ success: true, resource: newResource });
  } catch (error: any) {
    console.error('Upload resource error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload resource' }, { status: 500 });
  }
}
