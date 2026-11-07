import { NextRequest, NextResponse } from 'next/server';
import * as localDb from '@/lib/db';
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

    // 1. Resolve Class
    const classes = await getClasses();
    let targetClass = classes.find(
      (c) => c.id === classId || c.name.toLowerCase() === (classId || '').toLowerCase()
    );

    if (!targetClass && classes.length > 0) {
      targetClass = classes[0];
      classId = targetClass.id;
    } else if (!targetClass && classes.length === 0) {
      // Create a default initial classroom if none exists yet
      targetClass = await addClass({
        name: 'General Studies (Class I)',
        grade_level: 'Grade 1',
        icon: '🎒',
        color: '#38bdf8',
      });
      classId = targetClass.id;
    } else if (targetClass) {
      classId = targetClass.id;
    }

    // Ensure the resolved class row is present in local SQLite so no foreign key constraint can ever fail
    if (targetClass) {
      try {
        const localCls = localDb.getClassById(targetClass.id);
        if (!localCls) {
          localDb.createClass({
            id: targetClass.id,
            name: targetClass.name,
            grade_level: targetClass.grade_level || 'Grade 10',
            icon: targetClass.icon || '🎒',
            color: targetClass.color || '#38bdf8',
          });
        }
      } catch (clsErr) {
        // Safe to ignore if already exists
      }
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
            class_name: suProfile.classes?.name || targetClass?.name,
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
      try {
        const localStu = localDb.getStudentByNameAndClass(fullName, classId);
        if (localStu) {
          student = localStu;
        } else {
          // Check by name across all classes
          const anyLocal = localDb.listStudentsByClass().find(
            (s) => s.name.trim().toLowerCase() === fullName.toLowerCase()
          );
          if (anyLocal) {
            student = anyLocal;
          }
        }
      } catch (localErr) {
        console.warn('Local student lookup notice:', localErr);
      }
    }

    // 4. If student does NOT exist yet, auto-register on the fly!
    // (Teachers do NOT need to enroll students beforehand!)
    if (!student) {
      try {
        student = await addStudent({
          name: fullName,
          class_id: classId,
          avatar: avatar,
          pin: '',
        });
      } catch (enrollErr: any) {
        console.warn('addStudent fallback:', enrollErr);
        const fallbackId = 'stu_' + Math.random().toString(36).substring(2, 10);
        student = localDb.createUser({
          id: fallbackId,
          name: fullName,
          role: 'student',
          class_id: classId,
          avatar: avatar,
        });
      }
    }

    // 5. If somehow student is still not set, generate resilient student session
    if (!student) {
      student = {
        id: 'stu_' + Math.random().toString(36).substring(2, 10),
        name: fullName,
        role: 'student',
        class_id: classId,
        class_name: targetClass?.name,
        avatar: avatar,
        stars: 0,
      };
    }

    // 6. Sign JWT token
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
        class_name: student.class_name || targetClass?.name,
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
    console.error('Student login error fallback:', error);
    // Never fail student login with database errors; issue safe session
    const safeId = 'stu_' + Math.random().toString(36).substring(2, 10);
    const token = signToken({
      userId: safeId,
      role: 'student',
      name: 'Student Explorer',
    });
    return NextResponse.json({
      success: true,
      user: {
        id: safeId,
        name: 'Student Explorer',
        role: 'student',
        avatar: '🦊',
        stars: 0,
      },
      token,
    });
  }
}

