import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, STAFF_ROLES } from '@/lib/rbac';

// POST — add a document (URL link or reference) to a justification request
export async function POST(req: Request, { params }: { params: { id: string; justId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { fileUrl, filename, mimeType } = body;

    if (!fileUrl || !filename) {
      return NextResponse.json({ error: 'fileUrl et filename requis' }, { status: 400 });
    }

    const attachment = await prisma.justificationAttachment.create({
      data: {
        justificationRequestId: params.justId,
        filePath: fileUrl,   // store URL as filePath
        filename,
        mimeType: mimeType || null,
        size: null,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove an attachment
export async function DELETE(req: Request, { params }: { params: { id: string; justId: string } }) {
  const { error } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');
    if (!attachmentId) return NextResponse.json({ error: 'attachmentId requis' }, { status: 400 });

    await prisma.justificationAttachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
