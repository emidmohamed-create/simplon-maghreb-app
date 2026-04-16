import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES, STAFF_ROLES, getProjectManagerScope, requireAuth } from '@/lib/rbac';
import { buildSourcingSessionWhere } from '@/lib/sourcing-access';

export async function GET(req: Request) {
  const { error, user } = await requireAuth(STAFF_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const accessWhere = await buildSourcingSessionWhere(user);
  const where: any = { AND: [accessWhere] };
  if (status) where.AND.push({ status });
  if (search) {
    where.AND.push({
      OR: [
        { name: { contains: search } },
        { project: { name: { contains: search } } },
        { cohort: { name: { contains: search } } },
      ],
    });
  }

  const sessions = await prisma.sourcingSession.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      campus: { select: { id: true, name: true, city: true } },
      project: { select: { id: true, name: true, code: true } },
      cohort: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { candidates: true, juryMembers: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const { error, user } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, date, location, status, campusId, projectId, cohortId, notes } = body;

    if (!name) return NextResponse.json({ error: 'Nom de session requis' }, { status: 400 });

    let finalCampusId = campusId || null;
    let finalProjectId = projectId || null;
    let finalCohortId = cohortId || null;

    if (finalCohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: finalCohortId },
        select: { projectId: true, campusId: true },
      });
      if (cohort) {
        finalProjectId = finalProjectId || cohort.projectId;
        finalCampusId = finalCampusId || cohort.campusId;
      }
    }

    if (user?.role === 'ADMIN_CAMPUS') {
      finalCampusId = user.campusId || finalCampusId;
    }

    if (user?.role === 'PROJECT_MANAGER') {
      const scope = await getProjectManagerScope(user.id);
      const projectAllowed = finalProjectId ? scope.projectIds.includes(finalProjectId) : false;
      const cohortAllowed = finalCohortId ? scope.cohortIds.includes(finalCohortId) : false;
      if (!projectAllowed && !cohortAllowed) {
        return NextResponse.json({ error: 'Session hors de votre périmètre projet/cohorte' }, { status: 403 });
      }
    }

    const session = await prisma.sourcingSession.create({
      data: {
        name,
        date: date ? new Date(date) : null,
        location: location || null,
        status: status || 'DRAFT',
        campusId: finalCampusId,
        projectId: finalProjectId,
        cohortId: finalCohortId,
        notes: notes || null,
        createdById: user!.id,
      },
      include: {
        campus: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        cohort: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
