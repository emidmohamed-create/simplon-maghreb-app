import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function GET() {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const partners = await prisma.partner.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { projects: true } } },
  });

  return NextResponse.json(partners);
}

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN', 'PROJECT_MANAGER']);
  if (error) return error;

  const body = await req.json();
  const partner = await prisma.partner.create({
    data: {
      name: body.name,
      type: body.type || 'OTHER',
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      notes: body.notes,
    },
  });

  return NextResponse.json(partner, { status: 201 });
}
