import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES, canAccessCohortByScope } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  const followUps = await prisma.insertionFollowUp.findMany({
    where: { learnerProfile: { cohortId: params.id } },
    include: {
      learnerProfile: { select: { id: true, firstName: true, lastName: true, statusCurrent: true, insertionType: true } },
      organizedBy: { select: { id: true, firstName: true, lastName: true } }
    },
    orderBy: { plannedDate: 'asc' }
  });

  return NextResponse.json(followUps);
}

// POST: bulk generate follow-ups for specific learners
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;
  if (user?.role === 'PROJECT_MANAGER') {
    const allowed = await canAccessCohortByScope(user.id, user.role, params.id);
    if (!allowed) return NextResponse.json({ error: 'Acces refuse a cette cohorte' }, { status: 403 });
  }

  const body = await req.json();
  const { learnerIds, startDate, endDate, intervalDays = 15, modality = 'CALL' } = body;

  if (!learnerIds || !learnerIds.length || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });

  const learnersCount = await prisma.learnerProfile.count({
    where: { id: { in: learnerIds }, cohortId: params.id },
  });
  if (learnersCount !== learnerIds.length) {
    return NextResponse.json({ error: 'Some learners do not belong to this cohort' }, { status: 400 });
  }

  const newFollowUps = [];
  
  for (const learnerId of learnerIds) {
    let current = new Date(start);
    while (current <= end) {
      newFollowUps.push({
        learnerProfileId: learnerId,
        organizedById: user!.id,
        plannedDate: new Date(current),
        status: 'SCHEDULED',
        modality,
      });
      current.setDate(current.getDate() + intervalDays);
    }
  }

  await prisma.insertionFollowUp.createMany({
    data: newFollowUps
  });

  return NextResponse.json({ success: true, count: newFollowUps.length });
}
