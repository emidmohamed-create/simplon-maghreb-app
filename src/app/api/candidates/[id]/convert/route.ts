import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';
import { hash } from 'bcryptjs';

// Convert candidate to learner
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json();
  const { cohortId } = body;

  if (!cohortId) {
    return NextResponse.json({ error: 'Cohorte requise' }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
  });

  if (!candidate) {
    return NextResponse.json({ error: 'Candidat non trouvé' }, { status: 404 });
  }

  if (candidate.currentStage === 'CONVERTED') {
    return NextResponse.json({ error: 'Ce candidat a déjà été converti' }, { status: 400 });
  }

  // Find or Create user account for the learner
  let learnerUser = await prisma.user.findUnique({
    where: { email: candidate.email }
  });

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

  // Create learner profile
  const learner = await prisma.learnerProfile.create({
    data: {
      userId: learnerUser.id,
      candidateId: candidate.id,
      cohortId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      cin: candidate.cin,
      birthdate: candidate.birthdate,
    },
  });

  // Create initial status history
  await prisma.learnerStatusHistory.create({
    data: {
      learnerProfileId: learner.id,
      fromStatus: null,
      toStatus: 'IN_TRAINING',
      effectiveDate: new Date(),
      comment: 'Conversion depuis candidat',
      changedById: user!.id,
    },
  });

  // Update candidate stage
  await prisma.candidate.update({
    where: { id: params.id },
    data: { currentStage: 'CONVERTED' },
  });

  return NextResponse.json(learner, { status: 201 });
}
