export type SourcingCriteriaKey =
  | 'motivation'
  | 'technique'
  | 'communication'
  | 'disponibilite'
  | 'adaptabilite';

export type SourcingRecommendation = 'AUTO' | 'QUALIFIED' | 'WAITLIST' | 'REJECTED';

export type SourcingCriterion = {
  key: SourcingCriteriaKey;
  label: string;
  weight: number;
  helpText: string;
  groupKey: string;
};

export type SourcingCriteriaGroup = {
  key: string;
  label: string;
  description: string;
  criteria: SourcingCriterion[];
};

export type SourcingCriteriaMap = Record<SourcingCriteriaKey, number>;

export const SOURCE_CHANNEL_OPTIONS = [
  'Site web',
  'Facebook',
  'LinkedIn',
  'Instagram',
  'Partenaire',
  'Bouche-à-oreille',
  'Campus',
  'Autre',
];

export const ACADEMIC_LEVEL_OPTIONS = ['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Doctorat'];

export const SOURCING_CRITERIA_GROUPS: SourcingCriteriaGroup[] = [
  {
    key: 'profile',
    label: 'Profil & motivation',
    description: 'On mesure ici l’adéquation globale avec le programme et l’engagement du candidat.',
    criteria: [
      {
        key: 'motivation',
        label: 'Motivation & projet professionnel',
        weight: 1.35,
        helpText: 'Clarté du projet, envie de se former et cohérence du parcours.',
        groupKey: 'profile',
      },
      {
        key: 'disponibilite',
        label: 'Disponibilité & engagement',
        weight: 1.25,
        helpText: 'Date de disponibilité, assiduité attendue et capacité à suivre le rythme.',
        groupKey: 'profile',
      },
    ],
  },
  {
    key: 'skills',
    label: 'Compétences de base',
    description: 'Ces notes standardisent l’évaluation des prérequis et du potentiel d’apprentissage.',
    criteria: [
      {
        key: 'technique',
        label: 'Aptitudes techniques de base',
        weight: 1.4,
        helpText: 'Logique, compréhension des outils et aisance sur les bases du programme.',
        groupKey: 'skills',
      },
      {
        key: 'communication',
        label: 'Communication & expression',
        weight: 1,
        helpText: 'Capacité à s’exprimer clairement, écouter et argumenter.',
        groupKey: 'skills',
      },
    ],
  },
  {
    key: 'posture',
    label: 'Posture & adaptabilité',
    description: 'Le comportement attendu pendant la formation et la capacité à progresser vite.',
    criteria: [
      {
        key: 'adaptabilite',
        label: 'Adaptabilité & curiosité',
        weight: 1.1,
        helpText: 'Capacité à apprendre, rebondir et travailler avec des contraintes variables.',
        groupKey: 'posture',
      },
    ],
  },
];

export const SOURCING_SCORE_OPTIONS = [
  { value: 1, label: '1 - Insuffisant' },
  { value: 2, label: '2 - Faible' },
  { value: 3, label: '3 - Correct' },
  { value: 4, label: '4 - Bon' },
  { value: 5, label: '5 - Excellent' },
];

export const SOURCING_RECOMMENDATION_OPTIONS = [
  {
    value: 'AUTO' as const,
    label: 'Automatique selon le score',
    badgeClass: 'badge-gray',
    description: 'La recommandation finale est calculée à partir de la note globale.',
  },
  {
    value: 'QUALIFIED' as const,
    label: 'Qualifié',
    badgeClass: 'badge-green',
    description: 'Le profil peut continuer dans le pipeline ou passer à la conversion.',
  },
  {
    value: 'WAITLIST' as const,
    label: 'Liste d’attente',
    badgeClass: 'badge-orange',
    description: 'Le profil est intéressant mais doit rester en attente.',
  },
  {
    value: 'REJECTED' as const,
    label: 'Rejeté',
    badgeClass: 'badge-red',
    description: 'Le profil n’est pas retenu pour cette cohorte.',
  },
] as const;

const DEFAULT_SCORE = 3;

export function createDefaultSourcingCriteria(): SourcingCriteriaMap {
  return SOURCING_CRITERIA_GROUPS.reduce((acc, group) => {
    for (const criterion of group.criteria) {
      acc[criterion.key] = DEFAULT_SCORE;
    }
    return acc;
  }, {} as SourcingCriteriaMap);
}

export function normalizeSourcingCriteria(raw: unknown): SourcingCriteriaMap {
  const defaults = createDefaultSourcingCriteria();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;

  const source = raw as Record<string, unknown>;
  const normalized = { ...defaults };

  for (const group of SOURCING_CRITERIA_GROUPS) {
    for (const criterion of group.criteria) {
      const candidateValue = source[criterion.key];
      const parsed = typeof candidateValue === 'number' ? candidateValue : Number(candidateValue);
      if (Number.isFinite(parsed)) {
        normalized[criterion.key] = Math.min(5, Math.max(1, Math.round(parsed))) as 1 | 2 | 3 | 4 | 5;
      }
    }
  }

  return normalized;
}

export function parseSourcingCriteria(raw: unknown): SourcingCriteriaMap {
  if (typeof raw === 'string') {
    try {
      return normalizeSourcingCriteria(JSON.parse(raw));
    } catch {
      return createDefaultSourcingCriteria();
    }
  }
  return normalizeSourcingCriteria(raw);
}

export function computeSourcingScore(criteria: SourcingCriteriaMap): number {
  let weightTotal = 0;
  let weightedScore = 0;

  for (const group of SOURCING_CRITERIA_GROUPS) {
    for (const criterion of group.criteria) {
      const value = criteria[criterion.key] ?? DEFAULT_SCORE;
      weightTotal += criterion.weight;
      weightedScore += value * criterion.weight;
    }
  }

  if (weightTotal === 0) return 0;
  return Math.round((weightedScore / (weightTotal * 5)) * 1000) / 10;
}

export function suggestSourcingRecommendation(score: number): Exclude<SourcingRecommendation, 'AUTO'> {
  if (score >= 75) return 'QUALIFIED';
  if (score >= 55) return 'WAITLIST';
  return 'REJECTED';
}

export function resolveSourcingRecommendation(
  recommendation: SourcingRecommendation | string | null | undefined,
  score: number,
): Exclude<SourcingRecommendation, 'AUTO'> {
  if (recommendation === 'QUALIFIED' || recommendation === 'WAITLIST' || recommendation === 'REJECTED') {
    return recommendation;
  }

  if (recommendation === 'PENDING') return 'WAITLIST';

  return suggestSourcingRecommendation(score);
}

export function recommendationToStage(recommendation: SourcingRecommendation | string | null | undefined): string {
  if (recommendation === 'REJECTED') return 'REJECTED';
  if (recommendation === 'QUALIFIED') return 'QUALIFIED';
  return 'EVALUATED';
}

export function getSourcingRecommendationMeta(recommendation: SourcingRecommendation | string | null | undefined) {
  switch (recommendation) {
    case 'QUALIFIED':
      return {
        label: 'Qualifié',
        badgeClass: 'badge-green',
        description: 'Le profil est recommandé pour la suite du processus.',
      };
    case 'WAITLIST':
    case 'PENDING':
      return {
        label: 'Liste d’attente',
        badgeClass: 'badge-orange',
        description: 'Le profil mérite un suivi complémentaire avant décision.',
      };
    case 'REJECTED':
      return {
        label: 'Rejeté',
        badgeClass: 'badge-red',
        description: 'Le profil n’est pas retenu à ce stade.',
      };
    case 'AUTO':
      return {
        label: 'Automatique',
        badgeClass: 'badge-gray',
        description: 'La décision finale est calculée automatiquement à partir du score.',
      };
    default:
      return {
        label: 'En attente',
        badgeClass: 'badge-orange',
        description: 'La recommandation n’a pas encore été renseignée.',
      };
  }
}

