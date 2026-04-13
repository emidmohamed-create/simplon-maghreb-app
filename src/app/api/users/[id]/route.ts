import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { hash } from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      campus: true,
      projectAccesses: {
        include: { project: { select: { id: true, name: true } } },
      },
      cohortAccesses: {
        include: { cohort: { select: { id: true, name: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      role,
      password,
      campusId,
      isActive,
      projectAccessIds = [],
      cohortAccessIds = [],
    } = body;

    const data: any = { firstName, lastName, email, role, campusId, isActive };

    if (password && password.length >= 8) {
      data.passwordHash = await hash(password, 12);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: params.id },
        data,
      });

      await tx.userProjectAccess.deleteMany({ where: { userId: params.id } });
      await tx.userCohortAccess.deleteMany({ where: { userId: params.id } });

      if (role === 'PROJECT_MANAGER' && Array.isArray(projectAccessIds) && projectAccessIds.length > 0) {
        await tx.userProjectAccess.createMany({
          data: projectAccessIds.map((projectId: string) => ({ userId: params.id, projectId })),
          skipDuplicates: true,
        });
      }

      if (role === 'PROJECT_MANAGER' && Array.isArray(cohortAccessIds) && cohortAccessIds.length > 0) {
        await tx.userCohortAccess.createMany({
          data: cohortAccessIds.map((cohortId: string) => ({ userId: params.id, cohortId })),
          skipDuplicates: true,
        });
      }

      return updated;
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
      return NextResponse.json(
        { error: 'Base de donnees non synchronisee: veuillez executer prisma db push (ou migrate deploy si vos migrations sont PostgreSQL).' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Erreur lors de la mise a jour' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    await prisma.user.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression. Verifiez que l'utilisateur n'est pas lie a d'autres donnees." },
      { status: 500 }
    );
  }
}
