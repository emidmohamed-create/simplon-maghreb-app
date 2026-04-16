import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, requireAuth } from '@/lib/rbac';

export async function GET() {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER', 'TRAINER'] },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  return NextResponse.json(users);
}
