import { NextRequest, NextResponse } from 'next/server';
import { getClasses, addClass, getSubjects, addSubject, getUnits, addUnit } from '@/lib/data-service';
import { parseFileInfo } from '@/lib/filename-parser';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fileName, createHierarchy = true, overrideClassName } = body;

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid fileName.' }, { status: 400 });
    }

    const parsed = parseFileInfo(fileName);
    const targetClassName = (overrideClassName || parsed.className || 'Grade 1').trim();

    // 1. Check if class exists
    const existingClasses = await getClasses();
    let targetClass = existingClasses.find(
      (c) => c.name.toLowerCase() === targetClassName.toLowerCase()
    );

    let classAction: 'created' | 'updated' | 'matched' = 'matched';

    if (!targetClass) {
      // CREATE new class as per filename
      targetClass = await addClass({
        name: targetClassName,
        grade_level: parsed.gradeLevel || 'Grade 1',
        icon: parsed.classIcon || '🎒',
        color: parsed.classColor || '#38bdf8',
      });
      classAction = 'created';
    } else {
      classAction = 'matched';
    }

    let targetSubject = null;
    let targetUnit = null;

    if (createHierarchy && targetClass) {
      // 2. Check / Create Subject
      const targetSubjectName = (parsed.subjectName || 'General Studies').trim();
      const existingSubjects = await getSubjects(targetClass.id);
      targetSubject = existingSubjects.find(
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

      // 3. Check / Create Unit
      if (targetSubject) {
        const targetUnitName = (parsed.unitName || 'Unit 1: Fundamentals').trim();
        const existingUnits = await getUnits(targetSubject.id);
        targetUnit = existingUnits.find(
          (u) => u.name.toLowerCase() === targetUnitName.toLowerCase()
        );

        if (!targetUnit) {
          targetUnit = await addUnit({
            subject_id: targetSubject.id,
            name: targetUnitName,
            description: `Topic extracted from ${fileName}`,
            order_index: (existingUnits.length || 0) + 1,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      action: classAction,
      class: targetClass,
      subject: targetSubject,
      unit: targetUnit,
      parsed,
    });
  } catch (error: any) {
    console.error('Error creating/updating class from filename:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process class from file information' },
      { status: 500 }
    );
  }
}
