import { NextRequest, NextResponse } from 'next/server';
import { provisionStandardTechClasses } from '@/lib/tech-classes';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized. Teachers only.' }, { status: 403 });
  }

  try {
    const result = await provisionStandardTechClasses();
    return NextResponse.json({
      success: true,
      message: `Provisioned standard tech classes: ${result.created.length} created, ${result.existing.length} already existed.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Provision tech classes error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to provision standard tech classes' },
      { status: 500 }
    );
  }
}
