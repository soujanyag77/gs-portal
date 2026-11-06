import { NextRequest, NextResponse } from 'next/server';
import { deleteStudent } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const success = deleteStudent(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Student not found or could not be deleted' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Student removed successfully' });
}
