import { NextRequest, NextResponse } from 'next/server';
import { listStudentsByClass, createUser } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('class_id') || undefined;

  const students = listStudentsByClass(classId);
  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const { name, class_id, pin, avatar } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Student name is required.' }, { status: 400 });
    }
    if (!class_id) {
      return NextResponse.json({ error: 'Class is required for student.' }, { status: 400 });
    }

    const studentId = 'stu_' + Math.random().toString(36).substring(2, 10);
    const avatars = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐰', '🐸', '🦄', '🚀', '⭐'];
    const chosenAvatar = avatar || avatars[Math.floor(Math.random() * avatars.length)];

    const student = createUser({
      id: studentId,
      name: name.trim(),
      role: 'student',
      class_id,
      pin: pin ? pin.trim() : null,
      avatar: chosenAvatar,
      stars: 0,
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
