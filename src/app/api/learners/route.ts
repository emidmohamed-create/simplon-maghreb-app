import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, STAFF_ROLES } from '@/lib/rbac';

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

  // If trainer, only show their cohorts
  if (user!.role === 'TRAINER') {
    const trainerCohorts = await prisma.cohort.findMany({
      where: { trainerId: user!.id },
      select: { id: true },
    });
    where.cohortId = { in: trainerCohorts.map(c => c.id) };
  }

  const learners = await prisma.learnerProfile.findMany({
    where,
    orderBy: { lastName: 'asc' },
    include: {
      cohort: {
        select: {
          name: true,
          program: { select: { name: true, campus: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return NextResponse.json(learners);
}
