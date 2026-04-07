import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// POST /api/cohorts/[id]/fil-rouge/submissions — upsert a submission (learner or trainer)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      learnerProfileId, phaseId,
      status, deliverableUrl, learnerNote,
      startDate, endDate,
      trainerValidated, trainerComment,
    } = body;

    // Resolve validator if trainer is validating
    let validatedById: string | undefined = undefined;
    let validatedAt: Date | undefined = undefined;
    if (trainerValidated !== undefined && user?.id) {
      validatedById = user.id;
      validatedAt = trainerValidated ? new Date() : undefined;
    }

    const submission = await prisma.filRougeSubmission.upsert({
      where: { learnerProfileId_phaseId: { learnerProfileId, phaseId } },
      update: {
        status: status || undefined,
        deliverableUrl: deliverableUrl !== undefined ? (deliverableUrl || null) : undefined,
        learnerNote: learnerNote !== undefined ? (learnerNote || null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        trainerValidated: trainerValidated !== undefined ? trainerValidated : undefined,
        trainerComment: trainerComment !== undefined ? (trainerComment || null) : undefined,
        validatedById: validatedById || undefined,
        validatedAt: validatedAt || undefined,
        submittedAt: status === 'SUBMITTED' || status === 'TO_VALIDATE' ? new Date() : undefined,
      },
      create: {
        learnerProfileId,
        phaseId,
        status: status || 'PENDING',
        deliverableUrl: deliverableUrl || null,
        learnerNote: learnerNote || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        trainerValidated: trainerValidated || false,
        trainerComment: trainerComment || null,
        validatedById: validatedById || null,
        submittedAt: status === 'SUBMITTED' || status === 'TO_VALIDATE' ? new Date() : null,
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (err: any) {
    console.error('[FIL ROUGE SUBMISSION]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
