import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';

// GET /api/candidates/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth([...ADMIN_ROLES, 'TRAINER']);
  if (error) return error;

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      campus: { select: { name: true } },
      project: { select: { id: true, name: true, code: true } },
      evaluations: {
        include: { evaluator: { select: { firstName: true, lastName: true } } },
        orderBy: { evaluationDate: 'desc' },
      },
      learnerProfiles: { select: { id: true, cohortId: true, statusCurrent: true, cohort: { select: { name: true } } } },
    },
  });

  if (!candidate) return NextResponse.json({ error: 'Candidat introuvable' }, { status: 404 });
  return NextResponse.json(candidate);
}

// PUT /api/candidates/[id] — update candidate profile + stage
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      firstName, lastName, email, phone, cin, birthdate,
      gender, academicLevel, academicField, motivation,
      sourceChannel, currentStage, notes, campusId, projectId, contactHistory,
    } = body;

    const candidate = await prisma.candidate.update({
      where: { id: params.id },
      data: {
        firstName, lastName, email,
        phone: phone || null, cin: cin || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        gender: gender || null, academicLevel: academicLevel || null,
        academicField: academicField || null, motivation: motivation || null,
        sourceChannel: sourceChannel || null, currentStage, notes: notes || null,
        campusId: campusId || null, projectId: projectId || null,
        contactHistory: contactHistory ? (typeof contactHistory === 'string' ? contactHistory : JSON.stringify(contactHistory)) : null,
      },
    });

    return NextResponse.json(candidate);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
