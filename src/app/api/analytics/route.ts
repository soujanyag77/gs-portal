import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('class_id') || undefined;

  const summary = getAnalyticsSummary(classId);
  return NextResponse.json(summary);
}
