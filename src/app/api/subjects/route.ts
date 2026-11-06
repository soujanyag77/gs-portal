import { NextRequest, NextResponse } from 'next/server';
import { listSubjects, createSubject } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('class_id') || undefined;
  const subjects = listSubjects(classId);
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const { class_id, name, color_code, icon } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Subject name is required.' }, { status: 400 });
    }
    if (!class_id) {
      return NextResponse.json({ error: 'Class ID is required.' }, { status: 400 });
    }

    const id = 'subj_' + Math.random().toString(36).substring(2, 10);
    const subject = createSubject({
      id,
      class_id,
      name: name.trim(),
      color_code: color_code || '#38bdf8',
      icon: icon || '📚',
    });

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
