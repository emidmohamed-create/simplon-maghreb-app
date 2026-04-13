import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES, getProjectManagerScope } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const where: any = {};
  if (user?.role === 'PROJECT_MANAGER') {
    const scope = await getProjectManagerScope(user.id);
    if (scope.projectIds.length === 0) return NextResponse.json([]);
    where.id = { in: scope.projectIds };
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      partner: { select: { name: true } },
      _count: { select: { cohorts: true, candidates: true, programs: true } },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const body = await req.json();
  const { name, code, description, projectType, partnerId, fundingSource, startDate, endDate, targetCapacity, status } = body;

  if (!name || !code) {
    return NextResponse.json({ error: 'Nom et code requis' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name, code, description,
      projectType: projectType || 'OWN',
      partnerId: partnerId || null,
      fundingSource,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetCapacity: targetCapacity ? parseInt(targetCapacity) : null,
      status: status || 'DRAFT',
    },
  });

  return NextResponse.json(project, { status: 201 });
}
