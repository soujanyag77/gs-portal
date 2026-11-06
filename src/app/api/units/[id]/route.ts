import { NextRequest, NextResponse } from 'next/server';
import { getUnitById, updateUnit, deleteUnit } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unit = getUnitById(params.id);
  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }
  return NextResponse.json({ unit });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const updated = updateUnit(params.id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, unit: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  const success = deleteUnit(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete unit' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Unit deleted successfully' });
}
