import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// PUT /api/learners/[id]/meetings/[meetingId] — update a meeting
export async function PUT(req: Request, { params }: { params: { id: string; meetingId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { type, title, date, notes, outcome, isPrivate } = body;

    const meeting = await prisma.learnerMeeting.update({
      where: { id: params.meetingId },
      data: {
        type: type || undefined,
        title: title || undefined,
        date: date ? new Date(date) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
        outcome: outcome !== undefined ? (outcome || null) : undefined,
        isPrivate: isPrivate !== undefined ? isPrivate : undefined,
      },
      include: {
        organizedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(meeting);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/learners/[id]/meetings/[meetingId] — delete a meeting
export async function DELETE(req: Request, { params }: { params: { id: string; meetingId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    await prisma.learnerMeeting.delete({ where: { id: params.meetingId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
