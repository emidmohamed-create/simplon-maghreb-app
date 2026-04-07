import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
  if (error) return error;

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

  // Create plan
  const plan = await prisma.projectPlan.create({
    data: {
      projectId: params.id,
      name: `Planning - ${project.name}`,
      startDate: project.startDate,
      endDate: project.endDate,
      createdById: user!.id,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
