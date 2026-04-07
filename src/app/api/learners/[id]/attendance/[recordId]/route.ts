import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// PATCH — update the note/comment on a single attendance record
export async function PATCH(req: Request, { params }: { params: { id: string; recordId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { note } = body;

    const updated = await prisma.attendanceRecord.update({
      where: { id: params.recordId },
      data: { note: note || null },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
