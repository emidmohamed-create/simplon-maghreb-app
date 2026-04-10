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
    const { userId, cohortId } = body;

    if (!userId || !cohortId) {
      return NextResponse.json({ error: 'userId et cohortId sont requis' }, { status: 400 });
    }

    // Vérifier l'utilisateur
    const userToAssign = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAssign) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Vérifier la cohorte
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) {
      return NextResponse.json({ error: 'Cohorte introuvable' }, { status: 404 });
    }

    // Vérifier si le LearnerProfile existe déjà pour cette cohorte et cet utilisateur
    const existing = await prisma.learnerProfile.findFirst({
      where: { userId, cohortId }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Cet utilisateur est déjà dans cette cohorte' }, { status: 400 });
    }

    // Créer le LearnerProfile
    const learner = await prisma.learnerProfile.create({
      data: {
        userId: userToAssign.id,
        cohortId,
        firstName: userToAssign.firstName,
        lastName: userToAssign.lastName,
        email: userToAssign.email,
        statusCurrent: 'IN_TRAINING',
      }
    });

    // Créer le premier historique de statut
    await prisma.learnerStatusHistory.create({
      data: {
        learnerProfileId: learner.id,
        fromStatus: null,
        toStatus: 'IN_TRAINING',
        effectiveDate: new Date(),
        comment: 'Inscription initiale dans la formation',
        changedById: authUser!.id,
      }
    });

    return NextResponse.json(learner, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Erreur lors de l'assignation" }, { status: 500 });
  }
}
