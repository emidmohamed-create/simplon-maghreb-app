import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET() {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      isActive: true, lastLogin: true,
      campus: { select: { name: true } },
    },
  });

  return NextResponse.json(users);
}
