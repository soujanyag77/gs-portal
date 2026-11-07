import { NextRequest, NextResponse } from 'next/server';
import {
  getResources,
  addResource,
  getClasses,
  addClass,
  getSubjects,
  addSubject,
  getUnits,
  addUnit,
} from '@/lib/data-service';
import { getSessionUser } from '@/lib/auth';
import { detectFileType } from '@/lib/file-types';
import { parseFileInfo } from '@/lib/filename-parser';
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
    let unit_id = formData.get('unit_id') as string | null;
    let title = formData.get('title') as string | null;
    const description = (formData.get('description') as string | null) || '';
    const autoCreateFromFilename =
      formData.get('auto_create_class') === 'true' ||
      formData.get('auto_create_class') === '1' ||
      !unit_id;

    if (!file) {
      return NextResponse.json({ error: 'Please choose a file to upload.' }, { status: 400 });
    }

    const originalFileName = file.name;
    const parsed = parseFileInfo(originalFileName);

    // If unit_id is missing or auto_create_class requested, create or update class as per file information
    if (!unit_id && autoCreateFromFilename) {
      const targetClassName = parsed.className || 'Grade 1';
      const existingClasses = await getClasses();
      let targetClass = existingClasses.find(
        (c) => c.name.toLowerCase() === targetClassName.toLowerCase()
      );

      if (!targetClass) {
        targetClass = await addClass({
          name: targetClassName,
          grade_level: parsed.gradeLevel || 'Grade 1',
          icon: parsed.classIcon || '🎒',
          color: parsed.classColor || '#38bdf8',
        });
      }

      const targetSubjectName = parsed.subjectName || 'General Studies';
      const existingSubjects = await getSubjects(targetClass.id);
      let targetSubject = existingSubjects.find(
        (s) => s.name.toLowerCase() === targetSubjectName.toLowerCase()
      );

      if (!targetSubject) {
        targetSubject = await addSubject({
          class_id: targetClass.id,
          name: targetSubjectName,
          color_code: parsed.subjectColor || '#38bdf8',
          icon: parsed.subjectIcon || '📚',
        });
      }

      const targetUnitName = parsed.unitName || 'Unit 1: Exploration';
      const existingUnits = await getUnits(targetSubject.id);
      let targetUnit = existingUnits.find(
        (u) => u.name.toLowerCase() === targetUnitName.toLowerCase()
      );

      if (!targetUnit) {
        targetUnit = await addUnit({
          subject_id: targetSubject.id,
          name: targetUnitName,
          description: `Topic automatically organized from "${originalFileName}"`,
          order_index: (existingUnits.length || 0) + 1,
        });
      }

      unit_id = targetUnit.id;
    }

    if (!unit_id) {
      return NextResponse.json(
        { error: 'Please select or auto-create a Unit/Topic for this file.' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      title = parsed.title || originalFileName.replace(/\.[^/.]+$/, '');
    }

    const resourceId = 'res_' + Math.random().toString(36).substring(2, 10);
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

    return NextResponse.json({
      success: true,
      resource: newResource,
      parsedHierarchy: parsed,
    });
  } catch (error: any) {
    console.error('Upload resource error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload resource' },
      { status: 500 }
    );
  }
}
