import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      partner: true,
      programs: { include: { campus: { select: { name: true } } } },
      cohorts: {
        include: {
          program: { select: { name: true, campus: { select: { name: true } } } },
          trainer: { select: { firstName: true, lastName: true } },
          _count: { select: { learnerProfiles: true } },
        },
      },
      candidates: { select: { id: true, currentStage: true } },
      projectPlans: {
        include: {
          phases: {
            orderBy: { orderIndex: 'asc' },
            include: {
              items: { orderBy: { startDatetime: 'asc' } },
              childPhases: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
  if (error) return error;

  const body = await req.json();
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    await prisma.project.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lors de la suppression. Des données sont liées à ce projet.' }, { status: 500 });
  }
}
