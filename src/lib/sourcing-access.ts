import { prisma } from './prisma';
import { getProjectManagerScope } from './rbac';

type SessionUser = {
  id: string;
  role: string;
  campusId?: string | null;
};

export async function buildSourcingSessionWhere(user: SessionUser | null | undefined) {
  const where: any = {};

  if (!user) return where;

  if (user.role === 'ADMIN_CAMPUS') {
    where.campusId = user.campusId || '__none__';
  }

  if (user.role === 'PROJECT_MANAGER') {
    const scope = await getProjectManagerScope(user.id);
    where.OR = [
      ...(scope.projectIds.length ? [{ projectId: { in: scope.projectIds } }] : []),
      ...(scope.cohortIds.length ? [{ cohortId: { in: scope.cohortIds } }] : []),
      { juryMembers: { some: { userId: user.id } } },
    ];
  }

  if (user.role === 'TRAINER') {
    where.juryMembers = { some: { userId: user.id } };
  }

  return where;
}

export async function canAccessSourcingSession(user: SessionUser | null | undefined, sessionId: string) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const scopedWhere = await buildSourcingSessionWhere(user);
  const session = await prisma.sourcingSession.findFirst({
    where: { AND: [{ id: sessionId }, scopedWhere] },
    select: { id: true },
  });

  return Boolean(session);
}

export async function canFinalizeSourcingSession(user: SessionUser | null | undefined, sessionId: string) {
  if (!user) return false;
  if (['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER'].includes(user.role)) return true;

  const jury = await prisma.sourcingSessionJury.findFirst({
    where: { sessionId, userId: user.id, canFinalize: true },
    select: { id: true },
  });
  return Boolean(jury);
}

export async function canEvaluateSourcingSection(
  user: SessionUser | null | undefined,
  sessionId: string,
  section: string,
) {
  if (!user) return false;
  if (['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER'].includes(user.role)) return true;

  const jury = await prisma.sourcingSessionJury.findFirst({
    where: { sessionId, userId: user.id, section },
    select: { id: true },
  });
  return Boolean(jury);
}
