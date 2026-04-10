import { format, differenceInCalendarDays, isWeekend, eachDayOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TIMEZONE = 'Africa/Casablanca';

export function formatDate(date: Date | string, fmt: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, fmt, { locale: fr });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));
}

export function calcWorkingDaysBetween(start: Date, end: Date, holidays: Date[] = []): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  const holidaySet = new Set(holidays.map(h => format(h, 'yyyy-MM-dd')));
  return days.filter(d => !isWeekend(d) && !holidaySet.has(format(d, 'yyyy-MM-dd'))).length;
}

export function calcProgress(startDate: Date | null, endDate: Date | null): number {
  if (!startDate || !endDate) return 0;
  const now = new Date();
  if (now < startDate) return 0;
  if (now > endDate) return 100;
  const total = differenceInCalendarDays(endDate, startDate);
  if (total <= 0) return 100;
  const elapsed = differenceInCalendarDays(now, startDate);
  return Math.round((elapsed / total) * 100);
}

export function calcAbsenceRate(absences: number, expected: number, includeJustified: boolean = true): number {
  if (expected === 0) return 0;
  return Math.round((absences / expected) * 10000) / 100;
}

export function calcLateRate(lateCount: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.round((lateCount / expected) * 10000) / 100;
}

export function getRiskLevel(absenceRate: number): 'low' | 'medium' | 'high' {
  if (absenceRate >= 20) return 'high';
  if (absenceRate >= 10) return 'medium';
  return 'low';
}

export function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
  }
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export const STATUS_LABELS: Record<string, string> = {
  IN_TRAINING: 'En formation',
  DROPPED: 'AbandonnÃ©',
  INSERTED: 'InsÃ©rÃ©',
  EXCLUDED: 'Exclu',
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  COMPLETED: 'TerminÃ©',
  ARCHIVED: 'ArchivÃ©',
  PLANNED: 'PlanifiÃ©',
  IN_PROGRESS: 'En cours',
  DONE: 'TerminÃ©',
  CANCELLED: 'AnnulÃ©',
  POSTPONED: 'ReportÃ©',
  PENDING: 'En attente',
  APPROVED: 'ApprouvÃ©',
  REJECTED: 'RefusÃ©',
  NEW: 'Nouveau',
  CONTACTED: 'ContactÃ©',
  EVALUATED: 'Ã‰valuÃ©',
  QUALIFIED: 'QualifiÃ©',
  CONVERTED: 'Converti',
  PRESENT: 'PrÃ©sent',
  ABSENT: 'Absent',
  JUSTIFIED_ABSENT: 'Absent justifiÃ©',
  LATE: 'En retard',
  NOT_APPLICABLE: 'N/A',
  PUBLISHED: 'Publié',
};

export const INSERTION_LABELS: Record<string, string> = {
  INTERNSHIP: 'Stage',
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'Freelance',
  FURTHER_STUDIES: 'Poursuite d\'Ã©tudes',
};

export const PHASE_TYPE_LABELS: Record<string, string> = {
  COMMUNICATION: 'Communication',
  SOURCING: 'Sourcing',
  SELECTION: 'SÃ©lection',
  WARMUP: 'Warm-up',
  TRAINING: 'Formation',
  WORKSHOP: 'Atelier',
  FIL_ROUGE: 'Projet fil rouge',
  EVALUATION: 'Ã‰valuation',
  CERTIFICATION: 'Certification',
  RATTRAPAGE: 'Rattrapage',
  INSERTION: 'Insertion',
  OTHER: 'Autre',
};

export const ITEM_TYPE_LABELS: Record<string, string> = {
  ACTIVITY: 'ActivitÃ©',
  WORKSHOP: 'Atelier',
  MILESTONE: 'Jalon',
  EVENT: 'Ã‰vÃ©nement',
  REVIEW_POINT: 'Point de suivi',
  DEADLINE: 'Date limite',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CAMPUS: 'Admin Campus',
  PROJECT_MANAGER: 'ChargÃ© de projet',
  TRAINER: 'Formateur',
  LEARNER: 'Apprenant',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  OWN: 'Projet propre',
  FUNDED: 'Projet financÃ©',
  PARTNERSHIP: 'Partenariat',
};
