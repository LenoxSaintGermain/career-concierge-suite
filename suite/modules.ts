import { SuiteModule } from '../types';

// Concierge suite modules (post-login only).
// IDs are stable because we use them as document keys in Firestore.
export const SUITE_MODULES: SuiteModule[] = [
  {
    id: 'intake',
    index: '01',
    title: 'Start Here',
    subtitle: 'A short concierge conversation to calibrate your suite.',
    kind: 'flow',
    relatedIds: ['brief', 'profile', 'ai_profile', 'gaps', 'plan'],
  },
  {
    id: 'brief',
    index: '02',
    title: 'The Brief',
    subtitle: 'What I learned, what matters most, and your next 72 hours.',
    kind: 'artifact',
    relatedIds: ['plan', 'profile', 'ai_profile', 'gaps'],
  },
  {
    id: 'profile',
    index: '03',
    title: 'Your Profile',
    subtitle: 'Professional DNA: strengths, patterns, and leverage points.',
    kind: 'artifact',
    relatedIds: ['gaps', 'plan'],
  },
  {
    id: 'ai_profile',
    index: '04',
    title: 'Your AI Profile',
    subtitle: 'How you should use AI, based on how you work and decide.',
    kind: 'artifact',
    relatedIds: ['plan', 'gaps'],
  },
  {
    id: 'gaps',
    index: '05',
    title: 'Your Gaps',
    subtitle: 'What’s missing, what’s noisy, and what to tighten first.',
    kind: 'artifact',
    relatedIds: ['plan'],
  },
  {
    id: 'plan',
    index: '06',
    title: 'Your Plan',
    subtitle: '72 hours of momentum, then a 2-week sprint.',
    kind: 'artifact',
    relatedIds: ['assets'],
  },
  {
    id: 'assets',
    index: '07',
    title: 'Your Assets',
    subtitle: 'Resume versions, outreach drafts, scripts, and links.',
    kind: 'collection',
    relatedIds: ['plan'],
  },
];

