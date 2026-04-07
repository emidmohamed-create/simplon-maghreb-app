import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      partner: { select: { name: true } },
      _count: { select: { cohorts: true, candidates: true, programs: true } },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
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
