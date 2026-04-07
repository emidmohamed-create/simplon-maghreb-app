import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// PUT — update a PRPE case (progress steps, outcome, etc.)
export async function PUT(req: Request, { params }: { params: { id: string; caseId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();

    const updated = await prisma.pRPECase.update({
      where: { id: params.caseId },
      data: {
        caseType: body.caseType || undefined,
        status: body.status || undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        triggerNotes: body.triggerNotes !== undefined ? (body.triggerNotes || null) : undefined,
        triggerAbsenceDays: body.triggerAbsenceDays !== undefined ? body.triggerAbsenceDays : undefined,
        step0Notes: body.step0Notes !== undefined ? (body.step0Notes || null) : undefined,
        step0PreparedAt: body.step0PreparedAt !== undefined ? (body.step0PreparedAt ? new Date(body.step0PreparedAt) : null) : undefined,
        step1MailSentAt: body.step1MailSentAt !== undefined ? (body.step1MailSentAt ? new Date(body.step1MailSentAt) : null) : undefined,
        step2MeetingAt: body.step2MeetingAt !== undefined ? (body.step2MeetingAt ? new Date(body.step2MeetingAt) : null) : undefined,
        step2CRNotes: body.step2CRNotes !== undefined ? (body.step2CRNotes || null) : undefined,
        engagementSigned: body.engagementSigned !== undefined ? body.engagementSigned : undefined,
        step3RelanceSentAt: body.step3RelanceSentAt !== undefined ? (body.step3RelanceSentAt ? new Date(body.step3RelanceSentAt) : null) : undefined,
        step4TrackingNotes: body.step4TrackingNotes !== undefined ? (body.step4TrackingNotes || null) : undefined,
        decisionAt: body.decisionAt !== undefined ? (body.decisionAt ? new Date(body.decisionAt) : null) : undefined,
        outcome: body.outcome !== undefined ? (body.outcome || null) : undefined,
        outcomeNotes: body.outcomeNotes !== undefined ? (body.outcomeNotes || null) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — delete a PRPE case (only DRAFT)
export async function DELETE(req: Request, { params }: { params: { id: string; caseId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    await prisma.pRPECase.delete({ where: { id: params.caseId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
