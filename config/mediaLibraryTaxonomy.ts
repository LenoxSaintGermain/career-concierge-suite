export const MEDIA_LIBRARY_TAXONOMY_GROUPS = [
  {
    id: 'concept',
    label: 'Concept',
    values: ['llm_metaphor', 'operator_console', 'globe', 'systems_animation', 'trust_signal'],
  },
  {
    id: 'scene_type',
    label: 'Scene Type',
    values: ['cold_open', 'explainer', 'challenge_overlay', 'rehearsal', 'b_roll'],
  },
  {
    id: 'environment',
    label: 'Environment',
    values: ['prestige_office', 'boardroom', 'home_office', 'studio', 'abstract_system'],
  },
  {
    id: 'character_archetype',
    label: 'Character',
    values: ['executive_operator', 'team_lead', 'career_switcher', 'analyst'],
  },
  {
    id: 'industry',
    label: 'Industry',
    values: ['cross_industry', 'enterprise_saas', 'cpg', 'non_profit', 'healthcare'],
  },
  {
    id: 'role_level',
    label: 'Role Level',
    values: ['entry', 'manager', 'director', 'executive'],
  },
  {
    id: 'intent',
    label: 'Intent',
    values: ['current_role', 'target_role', 'not_sure'],
  },
  {
    id: 'focus',
    label: 'Focus',
    values: ['job_search', 'skills', 'leadership'],
  },
  {
    id: 'pace',
    label: 'Pace',
    values: ['straight', 'standard', 'story'],
  },
  {
    id: 'modality',
    label: 'Modality',
    values: ['auditory', 'interactive', 'hands_on', 'collaboration'],
  },
  {
    id: 'tone',
    label: 'Tone',
    values: ['calm', 'cinematic', 'precise', 'premium'],
  },
  {
    id: 'reusability_scope',
    label: 'Reuse Scope',
    values: ['global', 'industry_pack', 'persona_pack', 'client_specific'],
  },
  {
    id: 'status',
    label: 'Status',
    values: ['draft', 'approved', 'retired'],
  },
  {
    id: 'usage_rights',
    label: 'Usage Rights',
    values: ['owned', 'licensed', 'partner', 'external_embed'],
  },
] as const;

export const mergeMediaTags = (current: string[], next: string) =>
  [...new Set([...current, next].map((entry) => String(entry ?? '').trim()).filter(Boolean))];
