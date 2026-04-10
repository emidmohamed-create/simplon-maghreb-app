import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const cohort = await prisma.cohort.findUnique({
    where: { id: params.id },
    include: {
      program: true,
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          projectPlans: { select: { id: true, name: true } },
        },
      },
      trainer: { select: { id: true, firstName: true, lastName: true } },
      learnerProfiles: {
        select: { id: true, firstName: true, lastName: true, statusCurrent: true },
      },
      // Phases linked to this cohort via the "PhaseCohort" relation
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: {
          items: { orderBy: { startDatetime: 'asc' } },
        },
      },
    },
  });

  if (!cohort) return NextResponse.json({ error: 'Cohorte non trouvée' }, { status: 404 });
  return NextResponse.json(cohort);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER']);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, startDate, endDate, trainerId, capacity, projectId } = body;

    const updated = await prisma.cohort.update({
      where: { id: params.id },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        trainerId: trainerId || null,
        capacity: capacity ? parseInt(capacity) : null,
        projectId: projectId || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Erreur mise à jour cohorte:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    await prisma.cohort.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lors de la suppression. Des données (apprenants, émargements) sont liées à cette cohorte.' }, { status: 500 });
  }
}
