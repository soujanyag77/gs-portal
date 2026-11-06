import { NextRequest, NextResponse } from 'next/server';
import { getSubjectById, updateSubject, deleteSubject } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const subject = getSubjectById(params.id);
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }
  return NextResponse.json({ subject });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const updated = updateSubject(params.id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, subject: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const success = deleteSubject(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
}
