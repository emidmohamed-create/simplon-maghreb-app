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

  if (!learner) return NextResponse.json({ error: 'Apprenant non trouvé' }, { status: 404 });
  return NextResponse.json(learner);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const body = await req.json();
  
  const updateData: any = {};
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.cin !== undefined) updateData.cin = body.cin;
  if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
  if (body.insertionType !== undefined) updateData.insertionType = body.insertionType;
  if (body.insertionCompany !== undefined) updateData.insertionCompany = body.insertionCompany;
  if (body.insertionDate !== undefined) updateData.insertionDate = body.insertionDate ? new Date(body.insertionDate) : null;

  // Status change with history
  if (body.statusCurrent && body.statusCurrent !== body._previousStatus) {
    updateData.statusCurrent = body.statusCurrent;
    
    await prisma.learnerStatusHistory.create({
      data: {
        learnerProfileId: params.id,
        fromStatus: body._previousStatus || null,
        toStatus: body.statusCurrent,
        effectiveDate: new Date(),
        comment: body.statusComment || null,
        changedById: user!.id,
      },
    });
  }

  const learner = await prisma.learnerProfile.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(learner);
}
