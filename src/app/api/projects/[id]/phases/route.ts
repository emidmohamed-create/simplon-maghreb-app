import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
  if (error) return error;

  const body = await req.json();
  const { planId, title, phaseType, startDate, endDate, description, color, orderIndex } = body;

  const phase = await prisma.timelinePhase.create({
    data: {
      projectPlanId: planId,
      title,
      phaseType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      description,
      color,
      status: 'PLANNED',
      orderIndex: orderIndex || 0,
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
