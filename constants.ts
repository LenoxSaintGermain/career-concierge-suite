
export { SUITE_MODULES } from './suite/modules';

export const CLIENT_INTENTS = ['current_role', 'target_role', 'not_sure'] as const;
export const PACE_PREFS = ['straight', 'standard', 'story'] as const;
export const FOCUS_PREFS = ['job_search', 'skills', 'leadership'] as const;

// Intake prompts are intentionally short and scenario-tinged; they are not “test questions”.
export const INTAKE_PROMPTS: { id: string; label: string; placeholder?: string }[] = [
  { id: 'current_title', label: 'What is your current title?', placeholder: 'e.g., Executive Assistant' },
  { id: 'industry', label: 'What industry are you in (or targeting)?', placeholder: 'e.g., Healthcare, SaaS, Public sector' },
  { id: 'target', label: 'If you had to pick a direction, what are you aiming at?', placeholder: 'e.g., Project coordinator, Program manager' },
  { id: 'pressure_breaks', label: 'Under pressure, what breaks first?', placeholder: 'Time, clarity, confidence, energy' },
  { id: 'work_style', label: 'When you need momentum, what helps most?', placeholder: 'A template, a blank page, a conversation' },
  { id: 'constraints', label: 'Constraints we should respect?', placeholder: 'Time, location, salary, caregiving, etc.' },
];
