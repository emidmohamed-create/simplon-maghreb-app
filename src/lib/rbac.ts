import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type Role = 'SUPER_ADMIN' | 'ADMIN_CAMPUS' | 'PROJECT_MANAGER' | 'TRAINER' | 'LEARNER';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN_CAMPUS: 80,
  PROJECT_MANAGER: 60,
  TRAINER: 40,
  LEARNER: 20,
};

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), user: null };
  }
  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export function isAtLeast(userRole: string, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole as Role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export function canAccessCampus(userRole: string, userCampusId: string | null, targetCampusId: string | null): boolean {
  if (userRole === 'SUPER_ADMIN' || userRole === 'PROJECT_MANAGER') return true;
  if (userRole === 'ADMIN_CAMPUS') return userCampusId === targetCampusId;
  return false;
}

export async function getProjectManagerScope(userId: string) {
  const scope = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      projectAccesses: { select: { projectId: true } },
      cohortAccesses: { select: { cohortId: true } },
    },
  });

  if (!scope) {
    return { isProjectManager: false, projectIds: [] as string[], cohortIds: [] as string[] };
  }

  const projectIds = scope.projectAccesses.map((p) => p.projectId);
  const directCohortIds = scope.cohortAccesses.map((c) => c.cohortId);

  if (scope.role !== 'PROJECT_MANAGER') {
    return { isProjectManager: false, projectIds, cohortIds: directCohortIds };
  }

  let projectCohortIds: string[] = [];
  if (projectIds.length > 0) {
    const cohortsFromProjects = await prisma.cohort.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    projectCohortIds = cohortsFromProjects.map((c) => c.id);
  }

  return {
    isProjectManager: true,
    projectIds,
    cohortIds: Array.from(new Set([...directCohortIds, ...projectCohortIds])),
  };
}

export async function canAccessProjectByScope(userId: string, role: string, projectId: string) {
  if (role !== 'PROJECT_MANAGER') return true;
  const scope = await getProjectManagerScope(userId);
  return scope.projectIds.includes(projectId);
}

export async function canAccessCohortByScope(userId: string, role: string, cohortId: string) {
  if (role !== 'PROJECT_MANAGER') return true;
  const scope = await getProjectManagerScope(userId);
  return scope.cohortIds.includes(cohortId);
}

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER'];
export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER', 'TRAINER'];
export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER', 'TRAINER', 'LEARNER'];
