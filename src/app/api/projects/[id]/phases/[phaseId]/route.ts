import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function PUT(req: Request, { params }: { params: { id: string, phaseId: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER', 'ADMIN_CAMPUS', 'TRAINER']);
  if (error) return error;

  try {
    const body = await req.json();
    const { title, phaseType, startDate, endDate, status, criteriaJson } = body;

    const phase = await prisma.timelinePhase.update({
      where: { id: params.phaseId },
      data: {
        title,
        phaseType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
        ...(criteriaJson !== undefined && { criteriaJson: typeof criteriaJson === 'string' ? criteriaJson : JSON.stringify(criteriaJson) }),
      },
    });

    return NextResponse.json(phase);
  } catch (err: any) {
    console.error('Erreur mise à jour phase:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string, phaseId: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER', 'ADMIN_CAMPUS', 'TRAINER']);
  if (error) return error;

  try {
    const body = await req.json();
    const { criteriaJson } = body;

    const phase = await prisma.timelinePhase.update({
      where: { id: params.phaseId },
      data: {
        criteriaJson: typeof criteriaJson === 'string' ? criteriaJson : JSON.stringify(criteriaJson),
      },
    });

    return NextResponse.json(phase);
  } catch (err: any) {
    console.error('Erreur mise à jour critères phase:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


export async function DELETE(req: Request, { params }: { params: { id: string, phaseId: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER', 'ADMIN_CAMPUS']);
  if (error) return error;

  try {
    await prisma.timelinePhase.delete({
      where: { id: params.phaseId },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
