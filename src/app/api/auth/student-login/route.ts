import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getStudentByNameAndClass, getDb } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName, classId, pin } = await req.json();

    let student: any = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerSupabaseClient();
        let query = supabase.from('profiles').select('*, classes(name)').eq('role', 'student');
        if (studentId) {
          query = query.eq('id', studentId);
        } else if (studentName && classId) {
          query = query.ilike('name', studentName.trim()).eq('class_id', classId);
        }
        const { data: suProfile } = await query.maybeSingle();
        if (suProfile) {
          student = {
            id: suProfile.id,
            name: suProfile.name,
            role: 'student',
            class_id: suProfile.class_id,
            class_name: suProfile.classes?.name,
            avatar: suProfile.avatar,
            stars: suProfile.stars || 0,
            pin: suProfile.pin,
          };
        }
      } catch (err) {
        console.warn('Supabase student lookup notice:', err);
      }
    }

    if (!student) {
      if (studentId) {
        student = getUserById(studentId);
      } else if (studentName && classId) {
        student = getStudentByNameAndClass(studentName, classId);
      }
    }

    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Student profile not found. Please ask your teacher!' }, { status: 404 });
    }

    // Check PIN if the student profile has a PIN set
    if (student.pin) {
      if (!pin || pin.trim() !== student.pin.trim()) {
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
