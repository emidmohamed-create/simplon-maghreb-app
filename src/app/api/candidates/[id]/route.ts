import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      campus: { select: { name: true } },
      project: { select: { id: true, name: true, code: true } },
      evaluations: {
        include: { evaluator: { select: { firstName: true, lastName: true } } },
        orderBy: { evaluationDate: 'desc' },
      },
      learnerProfiles: { select: { id: true, cohortId: true, statusCurrent: true, cohort: { select: { name: true } } } },
    },
  });

  if (!candidate) return NextResponse.json({ error: 'Candidat introuvable' }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      cin,
      birthdate,
      gender,
      academicLevel,
      academicField,
      motivation,
      sourceChannel,
      currentStage,
      notes,
      campusId,
      projectId,
      contactHistory,
    } = body;

    const candidate = await prisma.$transaction(async (tx) => {
      const updatedCandidate = await tx.candidate.update({
        where: { id: params.id },
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          cin: cin || null,
          birthdate: birthdate ? new Date(birthdate) : null,
          gender: gender || null,
          academicLevel: academicLevel || null,
          academicField: academicField || null,
          motivation: motivation || null,
          sourceChannel: sourceChannel || null,
          currentStage,
          notes: notes || null,
          campusId: campusId || null,
          projectId: projectId || null,
          contactHistory: contactHistory ? (typeof contactHistory === 'string' ? contactHistory : JSON.stringify(contactHistory)) : null,
        },
      });

      const learnerSyncData: any = {};
      if (firstName !== undefined) learnerSyncData.firstName = firstName;
      if (lastName !== undefined) learnerSyncData.lastName = lastName;
      if (email !== undefined) learnerSyncData.email = email;
      if (phone !== undefined) learnerSyncData.phone = phone || null;
      if (cin !== undefined) learnerSyncData.cin = cin || null;
      if (birthdate !== undefined) learnerSyncData.birthdate = birthdate ? new Date(birthdate) : null;
      if (gender !== undefined) learnerSyncData.gender = gender || null;
      if (academicLevel !== undefined) learnerSyncData.academicLevel = academicLevel || null;
      if (academicField !== undefined) learnerSyncData.academicField = academicField || null;

      if (Object.keys(learnerSyncData).length > 0) {
        await tx.learnerProfile.updateMany({
          where: { candidateId: params.id },
          data: learnerSyncData,
        });
      }

      if (firstName !== undefined || lastName !== undefined || email !== undefined) {
        const linkedProfiles = await tx.learnerProfile.findMany({
          where: { candidateId: params.id, userId: { not: null } },
          select: { userId: true },
        });
        const userIds = Array.from(new Set(linkedProfiles.map((p) => p.userId).filter(Boolean))) as string[];

        for (const userId of userIds) {
          await tx.user.update({
            where: { id: userId },
            data: {
              firstName: updatedCandidate.firstName,
              lastName: updatedCandidate.lastName,
              email: updatedCandidate.email,
            },
          });
        }
      }

      return updatedCandidate;
    });

    return NextResponse.json(candidate);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
