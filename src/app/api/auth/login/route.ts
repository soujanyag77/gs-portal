import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter both email and password.' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Invalid teacher email or password.' }, { status: 401 });
    }

    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid teacher email or password.' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      role: 'teacher',
      name: user.name,
      classId: user.class_id,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };

    const response = NextResponse.json({ success: true, user: safeUser, token });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 });
  }
}
