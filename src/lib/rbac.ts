import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './auth';

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

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER'];
export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER', 'TRAINER'];
export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_CAMPUS', 'PROJECT_MANAGER', 'TRAINER', 'LEARNER'];
