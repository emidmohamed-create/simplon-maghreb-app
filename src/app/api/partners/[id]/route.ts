import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.partner.update({
      where: { id: params.id },
      data: body
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(['SUPER_ADMIN']);
  if (error) return error;

  try {
    await prisma.partner.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lors de la suppression. Des données sont probablement liées à ce partenaire.' }, { status: 500 });
  }
}
