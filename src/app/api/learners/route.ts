import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, STAFF_ROLES, getProjectManagerScope, canAccessCohortByScope } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get('cohortId');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const where: any = {};
  if (cohortId) where.cohortId = cohortId;
  if (status) where.statusCurrent = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (user!.role === 'TRAINER') {
    const trainerCohorts = await prisma.cohort.findMany({
      where: { trainerId: user!.id },
      select: { id: true },
    });
    where.cohortId = { in: trainerCohorts.map((c) => c.id) };
  }

  if (user!.role === 'PROJECT_MANAGER') {
    const scope = await getProjectManagerScope(user!.id);
    if (scope.cohortIds.length === 0) {
      return NextResponse.json([]);
    }
    if (where.cohortId && typeof where.cohortId === 'string') {
      if (!scope.cohortIds.includes(where.cohortId)) {
        return NextResponse.json([]);
      }
    } else {
      where.cohortId = { in: scope.cohortIds };
    }
  }

  const learners = await prisma.learnerProfile.findMany({
    where,
    orderBy: { lastName: 'asc' },
    include: {
      cohort: {
        select: {
          name: true,
          campus: { select: { id: true, name: true } },
          program: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json(learners);
}

export async function POST(req: Request) {
  const { error, user: authUser } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      userId,
      cohortId,
      firstName,
      lastName,
      email,
      phone,
      cin,
      birthdate,
      gender,
      emergencyContact,
      academicLevel,
      academicField,
    } = body;

    if (!userId || !cohortId) {
      return NextResponse.json({ error: 'userId and cohortId are required' }, { status: 400 });
    }

    const userToAssign = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAssign) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    if (authUser?.role === 'PROJECT_MANAGER') {
      const allowed = await canAccessCohortByScope(authUser.id, authUser.role, cohortId);
      if (!allowed) {
        return NextResponse.json({ error: 'Access denied to this cohort' }, { status: 403 });
      }
    }

    const existing = await prisma.learnerProfile.findFirst({ where: { userId, cohortId } });
    if (existing) {
      return NextResponse.json({ error: 'This user is already assigned to this cohort' }, { status: 400 });
    }

    const normalizedEmail = (email || userToAssign.email).trim().toLowerCase();
    const inferredCandidate = await prisma.candidate.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    });

    const learner = await prisma.$transaction(async (tx) => {
      const created = await tx.learnerProfile.create({
        data: {
          userId: userToAssign.id,
          candidateId: inferredCandidate?.id || null,
          cohortId,
          firstName: firstName?.trim() || userToAssign.firstName,
          lastName: lastName?.trim() || userToAssign.lastName,
          email: normalizedEmail,
          phone: phone ?? inferredCandidate?.phone ?? null,
          cin: cin ?? inferredCandidate?.cin ?? null,
          birthdate: birthdate ? new Date(birthdate) : inferredCandidate?.birthdate ?? null,
          gender: gender ?? inferredCandidate?.gender ?? null,
          emergencyContact: emergencyContact ?? null,
          academicLevel: academicLevel ?? inferredCandidate?.academicLevel ?? null,
          academicField: academicField ?? inferredCandidate?.academicField ?? null,
          statusCurrent: 'IN_TRAINING',
        },
      });

      await tx.learnerStatusHistory.create({
        data: {
          learnerProfileId: created.id,
          fromStatus: null,
          toStatus: 'IN_TRAINING',
          effectiveDate: new Date(),
          comment: 'Initial assignment to cohort',
          changedById: authUser!.id,
        },
      });

      await tx.user.update({
        where: { id: userToAssign.id },
        data: {
          firstName: created.firstName,
          lastName: created.lastName,
          email: created.email,
          role: 'LEARNER',
        },
      });

      if (inferredCandidate) {
        await tx.candidate.update({
          where: { id: inferredCandidate.id },
          data: {
            firstName: created.firstName,
            lastName: created.lastName,
            email: created.email,
            phone: created.phone,
            cin: created.cin,
            birthdate: created.birthdate,
            gender: created.gender,
            academicLevel: created.academicLevel,
            academicField: created.academicField,
            currentStage: 'CONVERTED',
          },
        });
      }

      return created;
    });

    return NextResponse.json(learner, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Error while assigning learner" }, { status: 500 });
  }
}
