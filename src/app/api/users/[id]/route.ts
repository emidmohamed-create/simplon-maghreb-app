import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { hash } from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { campus: true }
  });

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const { firstName, lastName, email, role, password, campusId, isActive } = body;

    const data: any = { firstName, lastName, email, role, campusId, isActive };
    
    if (password && password.length >= 8) {
      data.passwordHash = await hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    await prisma.user.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Erreur lors de la suppression. Vérifiez que l'utilisateur n'est pas lié à d'autres données." }, { status: 500 });
  }
}
