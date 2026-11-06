import { NextRequest, NextResponse } from 'next/server';
import { getClassById, updateClass, deleteClass } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cls = getClassById(params.id);
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  return NextResponse.json({ class: cls });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const updated = updateClass(params.id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, class: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const success = deleteClass(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Class deleted successfully' });
}
