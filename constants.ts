
export { SUITE_MODULES } from './suite/modules';

export const CLIENT_INTENTS = ['current_role', 'target_role', 'not_sure'] as const;
export const PACE_PREFS = ['straight', 'standard', 'story'] as const;
export const FOCUS_PREFS = ['job_search', 'skills', 'leadership'] as const;

export type SmartStartFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect';

export type SmartStartField = {
  id: string;
  section: string;
  label: string;
  type: SmartStartFieldType;
  placeholder?: string;
  options?: string[];
};

// Full Smart Start Intake field set, expressed in UI-ready sections.
export const SMART_START_FIELDS: SmartStartField[] = [
  {
    id: 'outcomes_goals',
    section: 'Outcomes & Goals',
    label: 'What outcomes would you love to achieve through your SkillSync Ai journey?',
    type: 'multiselect',
    options: ['Professional Visibility', 'Professional Advancement', 'Increased Compensation', 'Increased Stability'],
  },
  {
    id: 'target_compensation_level',
    section: 'Compensation & Role',
    label: 'Target compensation level',
    type: 'select',
    options: ['Under $100k', '$100k-$149k', '$150k-$199k', '$200k-$299k', '$300k+'],
  },
  {
    id: 'current_or_target_job_title',
    section: 'Compensation & Role',
    label: 'Current or target job title',
    type: 'text',
    placeholder: 'e.g., Program Manager',
  },
  {
    id: 'current_or_target_salary',
    section: 'Compensation & Role',
    label: 'Current or target salary',
    type: 'text',
    placeholder: 'e.g., $145,000',
  },
  {
    id: 'benefits_under_review',
    section: 'Compensation & Role',
    label: 'Current benefits at or near review',
    type: 'checkbox',
  },
  {
    id: 'ai_usage_frequency',
    section: 'Current AI Usage',
    label: 'How frequently do you use AI tools in your daily work activities?',
    type: 'radio',
    options: ['Rarely or never', 'Occasionally', 'Regularly', 'Daily'],
  },
  {
    id: 'enterprise_context',
    section: 'Enterprise Context',
    label: 'Does your company mandate use of specific AI platforms or models?',
    type: 'multiselect',
    options: ['ChatGPT Enterprise', 'Gemini', 'Copilot', 'Claude', 'No formal mandate', 'Other'],
  },
  {
    id: 'job_description',
    section: 'Job Description',
    label: 'Paste your current or target job description',
    type: 'textarea',
    placeholder: 'Optional, but highly recommended for alignment and gap calibration.',
  },
  {
    id: 'resume_source',
    section: 'Resume + Bio Alignment',
    label: 'Resume link or upload reference',
    type: 'text',
    placeholder: 'URL, file name, or notes',
  },
  {
    id: 'bio_alignment_requested',
    section: 'Resume + Bio Alignment',
    label: 'Run ALIGN MY BIO after upload',
    type: 'checkbox',
  },
  {
    id: 'foundational_interests',
    section: 'Foundational Areas of Interest',
    label: 'Select foundational areas',
    type: 'multiselect',
    options: [
      'Start using Ai in career development and coaching activities',
      'Using Ai for career development and upskilling',
      'Building a personal Ai toolkit for daily professional use',
      'Staying ahead of emerging Ai trends and innovations',
      'Data & Predictive Analytics',
      'Process Automation / Workflow Optimization',
      'Ai Strategy & Leadership',
      'Ethical / Responsible Ai',
      'Ai-powered products and solutions (incl. Prompt Engineering)',
    ],
  },
  {
    id: 'advanced_interests',
    section: 'Advanced Areas of Interest',
    label: 'Select advanced areas',
    type: 'multiselect',
    options: [
      'Fine-tuning & Zero-Shot Instruction',
      'Ai Agent Orchestration',
      'Multimodal Ai Mastery',
      'Enterprise Ai Architecture',
      'Custom Ai Solution Development',
      'Ai-Driven Customer Experience Optimization',
      'Automation Architecture & Workflow Design',
      'Ai for Business Intelligence & Real-Time Insights',
    ],
  },
  {
    id: 'learning_modalities',
    section: 'Learning Modality Preferences',
    label: 'How do you learn best?',
    type: 'multiselect',
    options: [
      'Auditory (podcasts, narrated lessons)',
      'Interactive coaching (live/async feedback loops)',
      'Hands-on applied exercises',
      'Collaboration and group sessions',
    ],
  },
  // Retained calibration fields currently used by suite generation and DNA.
  {
    id: 'current_title',
    section: 'Current Reality',
    label: 'What is your current title?',
    type: 'text',
    placeholder: 'e.g., Executive Assistant',
  },
  {
    id: 'industry',
    section: 'Current Reality',
    label: 'What industry are you in (or targeting)?',
    type: 'text',
    placeholder: 'e.g., Healthcare, SaaS, Public sector',
  },
  {
    id: 'target',
    section: 'Current Reality',
    label: 'If you had to pick a direction, what are you aiming at?',
    type: 'text',
    placeholder: 'e.g., Program manager',
  },
  {
    id: 'pressure_breaks',
    section: 'Current Reality',
    label: 'Under pressure, what breaks first?',
    type: 'text',
    placeholder: 'Time, clarity, confidence, energy',
  },
  {
    id: 'work_style',
    section: 'Current Reality',
    label: 'When you need momentum, what helps most?',
    type: 'text',
    placeholder: 'A template, a blank page, a conversation',
  },
  {
    id: 'constraints',
    section: 'Current Reality',
    label: 'Constraints we should respect?',
    type: 'text',
    placeholder: 'Time, location, salary, caregiving, etc.',
  },
];
