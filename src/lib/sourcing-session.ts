export type SourcingSectionKey = 'ADMIN_MOTIVATION' | 'TECHNICAL' | 'SERIOUS_GAME';

export type SourcingDecision = 'QUALIFIED' | 'WAITLIST' | 'REJECTED' | 'ABSENT' | 'PENDING';

export type SourcingCriterion = {
  key: string;
  label: string;
  helpText: string;
  weight: number;
};

export type SourcingSection = {
  key: SourcingSectionKey;
  label: string;
  shortLabel: string;
  description: string;
  weight: number;
  criteria: SourcingCriterion[];
};

export const SOURCING_SECTIONS: SourcingSection[] = [
  {
    key: 'ADMIN_MOTIVATION',
    label: 'Admin & motivation',
    shortLabel: 'Admin',
    description: 'Conditions de suivi, motivation, contraintes et cohérence du projet professionnel.',
    weight: 0.35,
    criteria: [
      {
        key: 'motivation_project',
        label: 'Motivation & projet professionnel',
        helpText: 'Clarté du projet, cohérence du parcours et envie de suivre la formation.',
        weight: 1.4,
      },
      {
        key: 'availability',
        label: 'Disponibilité & engagement',
        helpText: 'Disponibilité réelle, assiduité attendue et capacité à tenir le rythme.',
        weight: 1.25,
      },
      {
        key: 'logistics',
        label: 'Conditions logistiques',
        helpText: 'Distance, transport, ordinateur, contraintes familiales ou matérielles.',
        weight: 1.1,
      },
      {
        key: 'french_level',
        label: 'Maîtrise du français',
        helpText: 'Compréhension, expression et capacité à suivre les consignes.',
        weight: 0.9,
      },
      {
        key: 'non_verbal',
        label: 'Communication non verbale',
        helpText: 'Posture, attention, cohérence entre discours et attitude.',
        weight: 0.8,
      },
    ],
  },
  {
    key: 'TECHNICAL',
    label: 'Évaluation technique',
    shortLabel: 'Tech',
    description: 'Logique, culture technique, raisonnement et capacité à apprendre.',
    weight: 0.35,
    criteria: [
      {
        key: 'logic',
        label: 'Logique & raisonnement',
        helpText: 'Capacité à résoudre un problème simple et à expliquer son approche.',
        weight: 1.4,
      },
      {
        key: 'technical_basics',
        label: 'Bases techniques',
        helpText: 'Connaissances générales, outils, web, algorithmique ou notions du programme.',
        weight: 1.15,
      },
      {
        key: 'problem_solving',
        label: 'Résolution de problème',
        helpText: 'Méthode, autonomie, capacité à tester et corriger.',
        weight: 1.1,
      },
      {
        key: 'communication_clarity',
        label: 'Clarté de la communication',
        helpText: 'Réponses claires, structurées et compréhensibles.',
        weight: 0.9,
      },
      {
        key: 'idea_structure',
        label: 'Structuration des idées',
        helpText: 'Arguments, exemples et formalisation de la pensée.',
        weight: 0.85,
      },
    ],
  },
  {
    key: 'SERIOUS_GAME',
    label: 'Serious game',
    shortLabel: 'Game',
    description: 'Comportement collectif, initiative, adaptation et curiosité.',
    weight: 0.3,
    criteria: [
      {
        key: 'sharing',
        label: 'Partage des idées',
        helpText: 'Le candidat partage-t-il ses idées avec le groupe ?',
        weight: 1,
      },
      {
        key: 'listening',
        label: 'Écoute des autres',
        helpText: 'Prend-il en compte les idées et contraintes des autres ?',
        weight: 1,
      },
      {
        key: 'initiative',
        label: 'Initiative',
        helpText: 'Prend-il des initiatives utiles pendant l’activité ?',
        weight: 1.05,
      },
      {
        key: 'adaptation',
        label: 'Adaptation au groupe',
        helpText: 'S’adapte-t-il au rythme et au fonctionnement du groupe ?',
        weight: 1,
      },
      {
        key: 'engagement',
        label: 'Engagement',
        helpText: 'Est-il actif et impliqué dans le travail collectif ?',
        weight: 1.1,
      },
      {
        key: 'curiosity',
        label: 'Curiosité',
        helpText: 'Pose-t-il des questions et cherche-t-il à comprendre ?',
        weight: 0.9,
      },
    ],
  },
];

export const SOURCING_SCORE_OPTIONS = [
  { value: 1, label: '1 - Insuffisant' },
  { value: 2, label: '2 - Fragile' },
  { value: 3, label: '3 - Correct' },
  { value: 4, label: '4 - Bon' },
  { value: 5, label: '5 - Excellent' },
] as const;

export const SOURCING_RECOMMENDATION_OPTIONS = [
  { value: 'QUALIFIED', label: 'Validé', badgeClass: 'badge-green' },
  { value: 'WAITLIST', label: "Liste d'attente", badgeClass: 'badge-orange' },
  { value: 'REJECTED', label: 'Rejeté', badgeClass: 'badge-red' },
  { value: 'PENDING', label: 'À discuter', badgeClass: 'badge-gray' },
] as const;

export const SOURCING_CHECKIN_OPTIONS = [
  { value: 'INVITED', label: 'Invité', badgeClass: 'badge-gray' },
  { value: 'CONFIRMED', label: 'Confirmé', badgeClass: 'badge-blue' },
  { value: 'PRESENT', label: 'Présent', badgeClass: 'badge-green' },
  { value: 'NO_SHOW', label: 'Absent', badgeClass: 'badge-red' },
  { value: 'CANCELLED', label: 'Annulé', badgeClass: 'badge-gray' },
] as const;

export const DEFAULT_SOURCING_COMMITTEE = 'COMITE-1';

export const SOURCING_INTERVIEW_STATUS_OPTIONS = [
  { value: 'WAITING', label: 'En attente', badgeClass: 'badge-gray' },
  { value: 'IN_PROGRESS', label: 'En entretien', badgeClass: 'badge-orange' },
  { value: 'DONE', label: 'Entretien termine', badgeClass: 'badge-green' },
] as const;

export function normalizeCommitteeKey(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed || DEFAULT_SOURCING_COMMITTEE;
}

export function getSourcingSection(section: string | null | undefined) {
  return SOURCING_SECTIONS.find((item) => item.key === section) || SOURCING_SECTIONS[0];
}

export function createDefaultSectionCriteria(sectionKey: SourcingSectionKey | string) {
  const section = getSourcingSection(sectionKey);
  return section.criteria.reduce<Record<string, number>>((acc, criterion) => {
    acc[criterion.key] = 3;
    return acc;
  }, {});
}

export function normalizeSectionCriteria(sectionKey: SourcingSectionKey | string, raw: unknown) {
  const defaults = createDefaultSectionCriteria(sectionKey);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;

  const source = raw as Record<string, unknown>;
  const normalized = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const parsed = typeof source[key] === 'number' ? source[key] : Number(source[key]);
    if (Number.isFinite(parsed)) {
      normalized[key] = Math.min(5, Math.max(1, Math.round(parsed)));
    }
  }
  return normalized;
}

export function parseSectionCriteria(sectionKey: SourcingSectionKey | string, raw: unknown) {
  if (typeof raw === 'string') {
    try {
      return normalizeSectionCriteria(sectionKey, JSON.parse(raw));
    } catch {
      return createDefaultSectionCriteria(sectionKey);
    }
  }
  return normalizeSectionCriteria(sectionKey, raw);
}

export function computeSectionScore(sectionKey: SourcingSectionKey | string, rawCriteria: unknown) {
  const section = getSourcingSection(sectionKey);
  const criteria = parseSectionCriteria(section.key, rawCriteria);
  let weighted = 0;
  let totalWeight = 0;

  for (const criterion of section.criteria) {
    const value = criteria[criterion.key] || 3;
    weighted += value * criterion.weight;
    totalWeight += criterion.weight;
  }

  if (!totalWeight) return 0;
  return Math.round((weighted / (totalWeight * 5)) * 1000) / 10;
}

export function suggestSectionRecommendation(score: number): Exclude<SourcingDecision, 'ABSENT'> {
  if (score >= 75) return 'QUALIFIED';
  if (score >= 55) return 'WAITLIST';
  return 'REJECTED';
}

export function computeFinalSourcingScore(evaluations: Array<{ section: string; score: number | null }>) {
  let weighted = 0;
  let totalWeight = 0;

  for (const evaluation of evaluations) {
    if (typeof evaluation.score !== 'number') continue;
    const section = getSourcingSection(evaluation.section);
    weighted += evaluation.score * section.weight;
    totalWeight += section.weight;
  }

  if (!totalWeight) return null;
  return Math.round((weighted / totalWeight) * 10) / 10;
}

export function getSourcingDecisionMeta(decision: string | null | undefined) {
  switch (decision) {
    case 'QUALIFIED':
      return { label: 'Validé', badgeClass: 'badge-green' };
    case 'WAITLIST':
      return { label: "Liste d'attente", badgeClass: 'badge-orange' };
    case 'REJECTED':
      return { label: 'Rejeté', badgeClass: 'badge-red' };
    case 'ABSENT':
      return { label: 'Absent', badgeClass: 'badge-red' };
    default:
      return { label: 'En attente', badgeClass: 'badge-gray' };
  }
}

export function getCheckInMeta(status: string | null | undefined) {
  return SOURCING_CHECKIN_OPTIONS.find((item) => item.value === status) || SOURCING_CHECKIN_OPTIONS[0];
}

export function getInterviewStatusMeta(status: string | null | undefined) {
  return SOURCING_INTERVIEW_STATUS_OPTIONS.find((item) => item.value === status) || SOURCING_INTERVIEW_STATUS_OPTIONS[0];
}

export function decisionToCandidateStage(decision: string | null | undefined) {
  if (decision === 'QUALIFIED') return 'QUALIFIED';
  if (decision === 'REJECTED') return 'REJECTED';
  if (decision === 'WAITLIST') return 'EVALUATED';
  return 'CONTACTED';
}
