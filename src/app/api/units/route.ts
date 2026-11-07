import { NextRequest, NextResponse } from 'next/server';
import { getUnits, addUnit } from '@/lib/data-service';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subject_id') || undefined;
    const units = await getUnits(subjectId);
    return NextResponse.json({ units });
  } catch (error: any) {
    console.error('Failed to get units:', error);
    return NextResponse.json({ units: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const { subject_id, name, description, order_index } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Unit name is required.' }, { status: 400 });
    }
    if (!subject_id) {
      return NextResponse.json({ error: 'Subject ID is required.' }, { status: 400 });
    }

    const unit = await addUnit({
      subject_id,
      name: name.trim(),
      description: description?.trim() || '',
      order_index: typeof order_index === 'number' ? order_index : 0,
    });

    return NextResponse.json({ success: true, unit });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}
