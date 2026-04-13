import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES, canAccessCohortByScope } from '@/lib/rbac';

export async function PATCH(req: Request, { params }: { params: { id: string, followupId: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  if (user?.role === 'PROJECT_MANAGER') {
    const followup = await prisma.insertionFollowUp.findUnique({
      where: { id: params.followupId },
      select: { learnerProfile: { select: { cohortId: true } } },
    });
    if (!followup) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    const allowed = await canAccessCohortByScope(user.id, user.role, followup.learnerProfile.cohortId);
    if (!allowed) return NextResponse.json({ error: 'Access denied to this learner cohort' }, { status: 403 });
  }

  const body = await req.json();
  
  const updated = await prisma.insertionFollowUp.update({
    where: { id: params.followupId },
    data: {
      status: body.status,
      date: body.status === 'COMPLETED' ? new Date() : undefined,
      notes: body.notes,
      outcome: body.outcome,
      modality: body.modality,
      attachmentPath: body.attachmentPath,
      attachmentName: body.attachmentName,
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string, followupId: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  if (user?.role === 'PROJECT_MANAGER') {
    const followup = await prisma.insertionFollowUp.findUnique({
      where: { id: params.followupId },
      select: { learnerProfile: { select: { cohortId: true } } },
    });
    if (!followup) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    const allowed = await canAccessCohortByScope(user.id, user.role, followup.learnerProfile.cohortId);
    if (!allowed) return NextResponse.json({ error: 'Access denied to this learner cohort' }, { status: 403 });
  }

  await prisma.insertionFollowUp.delete({
    where: { id: params.followupId }
  });

  return NextResponse.json({ success: true });
}
