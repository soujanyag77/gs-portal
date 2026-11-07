import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getStudentByNameAndClass } from '@/lib/db';
import { getClasses, addClass, addStudent } from '@/lib/data-service';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || body.studentName || '').trim();
    let classId = body.classId;
    const avatar = body.avatar || '🦊';

    if (!fullName) {
      return NextResponse.json({ error: 'Please enter your full name to start learning!' }, { status: 400 });
    }

    // 1. Resolve Class ID
    const classes = await getClasses();
    if (!classId && classes.length > 0) {
      classId = classes[0].id;
    } else if (!classId && classes.length === 0) {
      // Create a default initial classroom if none exists yet
      const defaultCls = await addClass({
        name: 'General Studies (Class I)',
        grade_level: 'Grade 1',
        icon: '🎒',
        color: '#38bdf8',
      });
      classId = defaultCls.id;
    }

    let student: any = null;

    // 2. Check if student already exists in Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerSupabaseClient();
        const { data: suProfile } = await supabase
          .from('profiles')
          .select('*, classes(name)')
          .eq('role', 'student')
          .ilike('name', fullName)
          .maybeSingle();

        if (suProfile) {
          student = {
            id: suProfile.id,
            name: suProfile.name,
            role: 'student',
            class_id: suProfile.class_id || classId,
            class_name: suProfile.classes?.name,
            avatar: suProfile.avatar || avatar,
            stars: suProfile.stars || 0,
          };
        }
      } catch (err) {
        console.warn('Supabase student lookup notice:', err);
      }
    }

    // 3. Check local database if not found in Supabase
    if (!student) {
      const localStu = getStudentByNameAndClass(fullName, classId);
      if (localStu) {
        student = localStu;
      }
    }

    // 4. If student does NOT exist yet, auto-register on the fly!
    // (Teachers do NOT need to enroll students beforehand!)
    if (!student) {
      student = await addStudent({
        name: fullName,
        class_id: classId,
        avatar: avatar,
        pin: '',
      });
    }

    // 5. Sign token
    const token = signToken({
      userId: student.id,
      role: 'student',
      name: student.name,
      classId: student.class_id || classId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: student.id,
        name: student.name,
        role: 'student',
        class_id: student.class_id || classId,
        class_name: student.class_name,
        avatar: student.avatar || avatar,
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
    return NextResponse.json({ error: error.message || 'Error checking in student' }, { status: 500 });
  }
}

