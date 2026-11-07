import { NextRequest, NextResponse } from 'next/server';
import { getClasses, addClass } from '@/lib/data-service';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const classes = await getClasses();
    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error('Failed to get classes:', error);
    return NextResponse.json({ classes: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const { name, grade_level, icon, color } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Class name is required.' }, { status: 400 });
    }

    const newClass = await addClass({
      name: name.trim(),
      grade_level: grade_level?.trim() || 'Grade 1',
      icon: icon || '🎒',
      color: color || '#38bdf8',
    });

    return NextResponse.json({ success: true, class: newClass });
  } catch (error: any) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
