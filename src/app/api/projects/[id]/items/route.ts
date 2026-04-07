import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, user } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
  if (error) return error;

  const body = await req.json();
  const { phaseId, title, itemType, startDatetime, endDatetime, description, priority } = body;

  const item = await prisma.timelineItem.create({
    data: {
      phaseId: phaseId,
      title,
      itemType,
      startDatetime: startDatetime ? new Date(startDatetime) : new Date(),
      endDatetime: endDatetime ? new Date(endDatetime) : null,
      description,
      priority: priority || 'MEDIUM',
      status: 'PLANNED',
      responsibleUserId: user!.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
