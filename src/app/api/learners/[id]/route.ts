import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const learner = await prisma.learnerProfile.findUnique({
    where: { id: params.id },
    include: {
      cohort: {
        include: {
          campus: { select: { id: true, name: true } },
          program: true,
          project: true,
          trainer: { select: { firstName: true, lastName: true } },
          filRougeProject: {
            include: {
              phases: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      },
      candidate: true,
      insertionFollowUps: { orderBy: { plannedDate: 'asc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { firstName: true, lastName: true } } },
      },
      attendanceRecords: {
        include: { session: { select: { date: true, halfDay: true } } },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      },
      sprintEvaluations: {
        include: {
          sprintPhase: { select: { id: true, title: true, orderIndex: true, startDate: true, endDate: true } },
        },
        orderBy: { sprintPhase: { orderIndex: 'asc' } },
      },
      filRougeSubmissions: {
        include: {
          phase: { select: { id: true, name: true, deadline: true, orderIndex: true, isOptional: true } },
        },
        orderBy: { phase: { orderIndex: 'asc' } },
      },
    },
  });

  if (!learner) return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  return NextResponse.json(learner);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const body = await req.json();

  const learnerBefore = await prisma.learnerProfile.findUnique({
    where: { id: params.id },
    select: { id: true, statusCurrent: true, userId: true, candidateId: true },
  });

  if (!learnerBefore) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  const updateData: any = {};
  if (body.firstName !== undefined && body.firstName?.trim()) updateData.firstName = body.firstName.trim();
  if (body.lastName !== undefined && body.lastName?.trim()) updateData.lastName = body.lastName.trim();
  if (body.email !== undefined && body.email?.trim()) updateData.email = body.email.trim().toLowerCase();
  if (body.phone !== undefined) updateData.phone = body.phone || null;
  if (body.cin !== undefined) updateData.cin = body.cin || null;
  if (body.birthdate !== undefined) updateData.birthdate = body.birthdate ? new Date(body.birthdate) : null;
  if (body.gender !== undefined) updateData.gender = body.gender || null;
  if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact || null;
  if (body.academicLevel !== undefined) updateData.academicLevel = body.academicLevel || null;
  if (body.academicField !== undefined) updateData.academicField = body.academicField || null;
  if (body.insertionType !== undefined) updateData.insertionType = body.insertionType || null;
  if (body.insertionCompany !== undefined) updateData.insertionCompany = body.insertionCompany || null;
  if (body.insertionDate !== undefined) updateData.insertionDate = body.insertionDate ? new Date(body.insertionDate) : null;

  const previousStatus = learnerBefore.statusCurrent;
  const shouldCreateStatusHistory = !!body.statusCurrent && body.statusCurrent !== previousStatus;
  if (shouldCreateStatusHistory) {
    updateData.statusCurrent = body.statusCurrent;
  }

  const learner = await prisma.$transaction(async (tx) => {
    if (shouldCreateStatusHistory) {
      await tx.learnerStatusHistory.create({
        data: {
          learnerProfileId: params.id,
          fromStatus: previousStatus || null,
          toStatus: body.statusCurrent,
          effectiveDate: new Date(),
          comment: body.statusComment || null,
          changedById: user!.id,
        },
      });
    }

    const updated = await tx.learnerProfile.update({
      where: { id: params.id },
      data: updateData,
    });

    const shouldSyncUser = learnerBefore.userId && (body.firstName !== undefined || body.lastName !== undefined || body.email !== undefined);
    if (shouldSyncUser) {
      await tx.user.update({
        where: { id: learnerBefore.userId! },
        data: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
        },
      });
    }

    if (learnerBefore.candidateId) {
      await tx.candidate.update({
        where: { id: learnerBefore.candidateId },
        data: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone,
          cin: updated.cin,
          birthdate: updated.birthdate,
          gender: updated.gender,
          academicLevel: updated.academicLevel,
          academicField: updated.academicField,
        },
      });
    }

    return updated;
  });

  return NextResponse.json(learner);
}
