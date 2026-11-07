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
    let unit_id = (formData.get('unit_id') as string | null) || '';
    let title = (formData.get('title') as string | null) || '';
    const description = (formData.get('description') as string | null) || '';
    const classNameInput = (formData.get('class_name') as string | null) || '';
    const subjectNameInput = (formData.get('subject_name') as string | null) || '';
    const unitNameInput = (formData.get('unit_name') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'Please choose or attach a file to publish.' }, { status: 400 });
    }

    const originalFileName = file.name;
    const parsed = parseFileInfo(originalFileName);

    // Resolve hierarchy target names (typed value has highest priority, then parsed filename, then sensible fallback)
    const targetClassName = (classNameInput.trim() || parsed.className || 'X A AI').trim();
    const targetSubjectName = (
      subjectNameInput.trim() ||
      parsed.subjectName ||
      (targetClassName.toLowerCase().includes('cs') ? 'Computer Science' : 'Artificial Intelligence')
    ).trim();
    const targetUnitName = (
      unitNameInput.trim() ||
      parsed.unitName ||
      `Unit 1: Introduction to ${targetSubjectName}`
    ).trim();

    // 1. Resolve or Create Class
    const existingClasses = await getClasses();
    let targetClass = existingClasses.find(
      (c) =>
        c.name.trim().toLowerCase() === targetClassName.toLowerCase() ||
        c.id.toLowerCase() === targetClassName.toLowerCase()
    );

    if (!targetClass) {
      let inferredGrade = parsed.gradeLevel || 'Grade 1';
      let inferredIcon = parsed.classIcon || '🎒';
      let inferredColor = parsed.classColor || '#38bdf8';

      const lowerClass = targetClassName.toLowerCase();
      if (lowerClass.includes('xii') || lowerClass.includes('12')) {
        inferredGrade = 'Grade 12 (Class XII)';
        inferredIcon = '👑';
        inferredColor = '#e11d48';
      } else if (lowerClass.includes('xi') || lowerClass.includes('11')) {
        inferredGrade = 'Grade 11 (Class XI)';
        inferredIcon = lowerClass.includes('cs') ? '💻' : '🤖';
        inferredColor = lowerClass.includes('cs') ? '#2563eb' : '#a855f7';
      } else if (lowerClass.includes('x ') || lowerClass.includes('10')) {
        inferredGrade = 'Grade 10 (Class X)';
        inferredIcon = lowerClass.includes('b') ? '🧠' : '🤖';
        inferredColor = lowerClass.includes('b') ? '#8b5cf6' : '#6366f1';
      }

      targetClass = await addClass({
        name: targetClassName,
        grade_level: inferredGrade,
        icon: inferredIcon,
        color: inferredColor,
      });
    }

    // 2. Resolve or Create Subject under this Class
    const existingSubjects = await getSubjects(targetClass.id);
    let targetSubject = existingSubjects.find(
      (s) =>
        s.name.trim().toLowerCase() === targetSubjectName.toLowerCase() ||
        s.id.toLowerCase() === targetSubjectName.toLowerCase()
    );

    if (!targetSubject) {
      let inferredSubjIcon = parsed.subjectIcon || '📚';
      let inferredSubjColor = parsed.subjectColor || '#38bdf8';
      const lowerSub = targetSubjectName.toLowerCase();

      if (lowerSub.includes('ai') || lowerSub.includes('artificial')) {
        inferredSubjIcon = '🤖';
        inferredSubjColor = '#6366f1';
      } else if (lowerSub.includes('cs') || lowerSub.includes('computer') || lowerSub.includes('python') || lowerSub.includes('coding')) {
        inferredSubjIcon = '💻';
        inferredSubjColor = '#2563eb';
      } else if (lowerSub.includes('science') || lowerSub.includes('physics') || lowerSub.includes('biology')) {
        inferredSubjIcon = '🧪';
        inferredSubjColor = '#10b981';
      } else if (lowerSub.includes('math') || lowerSub.includes('algebra')) {
        inferredSubjIcon = '📐';
        inferredSubjColor = '#0ea5e9';
      }

      targetSubject = await addSubject({
        class_id: targetClass.id,
        name: targetSubjectName,
        color_code: inferredSubjColor,
        icon: inferredSubjIcon,
      });
    }

    // 3. Resolve or Create Unit under this Subject
    // Group files into units by matching targetUnitName case-insensitively
    const existingUnits = await getUnits(targetSubject.id);
    let targetUnit = existingUnits.find(
      (u) =>
        u.name.trim().toLowerCase() === targetUnitName.toLowerCase() ||
        (unit_id && u.id === unit_id)
    );

    if (!targetUnit) {
      targetUnit = await addUnit({
        subject_id: targetSubject.id,
        name: targetUnitName,
        description: `Topic organized for ${originalFileName}`,
        order_index: (existingUnits.length || 0) + 1,
      });
    }

    unit_id = targetUnit.id;

    if (!title || !title.trim()) {
      title = parsed.title || originalFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
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
      class: targetClass,
      subject: targetSubject,
      unit: targetUnit,
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
