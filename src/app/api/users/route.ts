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

export async function POST(req: Request) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const { firstName, lastName, email, role, password, campusId } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    // Import hash directly or locally
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role: role || 'LEARNER',
        passwordHash,
        campusId: campusId || null,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
