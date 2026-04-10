import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';
import { hash } from 'bcryptjs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json();
  const { cohortId } = body;

  if (!cohortId) {
    return NextResponse.json({ error: 'Cohort is required' }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  if (candidate.currentStage === 'CONVERTED') {
    return NextResponse.json({ error: 'Candidate is already converted' }, { status: 400 });
  }

  const existingForCohort = await prisma.learnerProfile.findFirst({
    where: { candidateId: candidate.id, cohortId },
    select: { id: true },
  });
  if (existingForCohort) {
    return NextResponse.json({ error: 'Candidate is already linked to this cohort' }, { status: 400 });
  }

  let learnerUser = await prisma.user.findUnique({ where: { email: candidate.email } });
  if (!learnerUser) {
    const passwordHash = await hash('password123', 12);
    learnerUser = await prisma.user.create({
      data: {
        email: candidate.email,
        passwordHash,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        role: 'LEARNER',
        campusId: candidate.campusId,
      },
    });
  }

  const learner = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: learnerUser!.id },
      data: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        role: 'LEARNER',
        campusId: candidate.campusId,
      },
    });

    const created = await tx.learnerProfile.create({
      data: {
        userId: learnerUser!.id,
        candidateId: candidate.id,
        cohortId,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        cin: candidate.cin,
        birthdate: candidate.birthdate,
        gender: candidate.gender,
        academicLevel: candidate.academicLevel,
        academicField: candidate.academicField,
      },
    });

    await tx.learnerStatusHistory.create({
      data: {
        learnerProfileId: created.id,
        fromStatus: null,
        toStatus: 'IN_TRAINING',
        effectiveDate: new Date(),
        comment: 'Converted from candidate',
        changedById: user!.id,
      },
    });

    await tx.candidate.update({
      where: { id: params.id },
      data: { currentStage: 'CONVERTED' },
    });

    return created;
  });

  return NextResponse.json(learner, { status: 201 });
}
