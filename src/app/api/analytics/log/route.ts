import { NextRequest, NextResponse } from 'next/server';
import { getResourceById, getUserById } from '@/lib/db';
import { recordActivityLog } from '@/lib/data-service';
import { getSessionUser } from '@/lib/auth';
import { ActionType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = getSessionUser(req);
    const body = await req.json();
    const { resource_id, action_type, student_id, student_name } = body;

    if (!resource_id) {
      return NextResponse.json({ error: 'Resource ID is required.' }, { status: 400 });
    }

    const resource = getResourceById(resource_id);

    // Determine student info
    let finalStudentId = sessionUser?.role === 'student' ? sessionUser.id : student_id;
    let finalStudentName = sessionUser?.role === 'student' ? sessionUser.name : student_name;

    if (!finalStudentId && sessionUser) {
      finalStudentId = sessionUser.id;
      finalStudentName = sessionUser.name;
    }

    if (!finalStudentId) {
      finalStudentId = 'stu_anon';
      finalStudentName = 'Explorer Student';
    } else if (!finalStudentName) {
      try {
        const u = getUserById(finalStudentId);
        finalStudentName = u?.name || 'Student';
      } catch {
        finalStudentName = 'Student';
      }
    }

    const validAction: ActionType = ['view', 'download', 'interact', 'complete'].includes(action_type)
      ? action_type
      : 'view';

    const logged = await recordActivityLog({
      student_id: finalStudentId,
      student_name: finalStudentName,
      resource_id: resource?.id || resource_id,
      resource_title: resource?.title || 'Class Material',
      class_name: resource?.class_name || 'General Class',
      subject_name: resource?.subject_name || 'General Subject',
      unit_name: resource?.unit_name || 'General Unit',
      action_type: validAction,
    });

    return NextResponse.json({ success: true, log: logged });
  } catch (error: any) {
    console.error('Activity logging error:', error);
    return NextResponse.json({ error: 'Failed to record activity log' }, { status: 500 });
  }
}
