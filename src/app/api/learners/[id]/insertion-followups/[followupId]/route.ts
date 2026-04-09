import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

export async function PATCH(req: Request, { params }: { params: { id: string, followupId: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

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
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  await prisma.insertionFollowUp.delete({
    where: { id: params.followupId }
  });

  return NextResponse.json({ success: true });
}
