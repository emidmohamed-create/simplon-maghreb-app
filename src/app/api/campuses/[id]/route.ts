import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const campus = await prisma.campus.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (!campus) return NextResponse.json({ error: 'Campus non trouvé' }, { status: 404 });
  return NextResponse.json(campus);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const body = await req.json();
  const campus = await prisma.campus.update({
    where: { id: params.id },
    data: {
      name: body.name,
      city: body.city,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(campus);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  await prisma.campus.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
