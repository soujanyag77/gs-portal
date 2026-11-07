import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter both email and password.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const defaultEmail = (process.env.DEFAULT_TEACHER_EMAIL || 'teacher@school.edu').toLowerCase();
    const defaultPass = process.env.DEFAULT_TEACHER_PASSWORD || 'teacher123';
    const defaultName = process.env.DEFAULT_TEACHER_NAME || 'Ms. Harper';

    // 1. Check Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerSupabaseClient();
        const { data: suAuth, error: suErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (!suErr && suAuth?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', suAuth.user.id)
            .maybeSingle();

          const teacherName = profile?.name || suAuth.user.user_metadata?.name || defaultName;
          const token = signToken({
            userId: suAuth.user.id,
            role: 'teacher',
            name: teacherName,
            classId: null,
          });

          const response = NextResponse.json({
            success: true,
            user: {
              id: suAuth.user.id,
              name: teacherName,
              email: suAuth.user.email,
              role: 'teacher',
              avatar: profile?.avatar || '👩‍🏫',
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
        }
      } catch (err) {
        console.warn('Supabase auth notice:', err);
      }
    }

    // 2. Check default env credentials (instant teacher login on fresh Vercel deploy)
    if (trimmedEmail === defaultEmail && password === defaultPass) {
      const token = signToken({
        userId: 'teacher_default',
        role: 'teacher',
        name: defaultName,
        classId: null,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'teacher_default',
          name: defaultName,
          email: defaultEmail,
          role: 'teacher',
          avatar: '👩‍🏫',
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
    }

    // 3. Fallback to local db if available
    try {
      const user = getUserByEmail(trimmedEmail);
      if (user && user.role === 'teacher' && user.password_hash) {
        if (verifyPassword(password, user.password_hash)) {
          const token = signToken({
            userId: user.id,
            role: 'teacher',
            name: user.name,
            classId: user.class_id,
          });

          const response = NextResponse.json({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              avatar: user.avatar,
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
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: 'Invalid teacher email or password.' }, { status: 401 });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 });
  }
}
