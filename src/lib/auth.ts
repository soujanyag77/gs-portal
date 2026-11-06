import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { User } from './types';
import { getUserById } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'gs-portal-kid-friendly-secret-key-2026';
const TOKEN_COOKIE_NAME = 'portal_token';

export interface TokenPayload {
  userId: string;
  role: 'teacher' | 'student';
  name: string;
  classId?: string | null;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function getSessionUser(req?: NextRequest): User | null {
  let token: string | undefined;

  if (req) {
    // Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // Check cookies from request
    if (!token) {
      token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    }
  }

  // Fallback to next/headers cookies() if in server component or route handler
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      // not in request context
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  return getUserById(payload.userId);
}

export { TOKEN_COOKIE_NAME };
