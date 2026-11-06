import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getStudentByNameAndClass, getDb } from '@/lib/db';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName, classId, pin } = await req.json();

    let student: any = null;

    if (studentId) {
      student = getUserById(studentId);
    } else if (studentName && classId) {
      student = getStudentByNameAndClass(studentName, classId);
    }

    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Student profile not found. Please ask your teacher!' }, { status: 404 });
    }

    // Check PIN if the student profile has a PIN set
    const db = getDb();
    const fullStudent: any = db.prepare('SELECT * FROM users WHERE id = ?').get(student.id);

    if (fullStudent?.pin) {
      if (!pin || pin.trim() !== fullStudent.pin.trim()) {
        return NextResponse.json({ error: 'Oops! That PIN is incorrect. Try again!' }, { status: 401 });
      }
    }

    const token = signToken({
      userId: student.id,
      role: 'student',
      name: student.name,
      classId: student.class_id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: student.id,
        name: student.name,
        role: student.role,
        class_id: student.class_id,
        class_name: student.class_name,
        avatar: student.avatar,
        stars: student.stars || 0,
      },
      token,
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Student login error:', error);
    return NextResponse.json({ error: 'Error logging in' }, { status: 500 });
  }
}
