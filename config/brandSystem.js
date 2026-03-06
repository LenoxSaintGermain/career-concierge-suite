export const BRAND_MODULE_IDS = [
  'intake',
  'episodes',
  'brief',
  'suite_distilled',
  'profile',
  'ai_profile',
  'gaps',
  'readiness',
  'my_concierge',
  'cjs_execution',
  'plan',
  'assets',
  'roadmap',
];

export const BRAND_HEADER_SCALES = ['compact', 'standard', 'hero'];
export const BRAND_SUBHEADER_SCALES = ['tight', 'standard', 'airy'];
export const BRAND_BODY_DENSITIES = ['tight', 'standard', 'relaxed'];
export const BRAND_TILE_EMPHASES = ['index', 'balanced', 'title'];
export const BRAND_OVERLAY_STYLES = ['editorial', 'minimal', 'cinematic'];

export const DEFAULT_BRAND_MODULES = {
  intake: {
    eyebrow: 'Smart Start Intake',
    title: 'Start Here',
    description: 'A short concierge conversation to calibrate your suite.',
    detail_title: 'Smart Start Intake',
    detail_quote: 'A short concierge conversation to calibrate your suite.',
  },
  episodes: {
    eyebrow: 'SkillSync Ai TV',
    title: 'Episodes',
    description: 'Narrated and visual learning moments matched to your current journey.',
    detail_title: 'Episodes',
    detail_quote: 'Bingeable micro-learning with concierge pacing and stronger instincts.',
  },
  brief: {
    eyebrow: 'Professional DNA',
    title: 'The Brief',
    description: 'What we learned, what matters now, and what to do next.',
    detail_title: 'The Brief',
    detail_quote: 'The shortest path from intake signal to strategic clarity.',
  },
  suite_distilled: {
    eyebrow: 'Suite Distilled',
    title: 'Distilled',
    description: 'A condensed strategic summary of what the suite sees and recommends.',
    detail_title: 'Suite Distilled',
    detail_quote: 'Condensed operating context across profile, momentum, and next action.',
  },
  profile: {
    eyebrow: 'Assessment',
    title: 'Your Profile',
    description: 'Transferable strengths, operating patterns, and leverage points.',
    detail_title: 'Your Profile',
    detail_quote: 'A concise read on who you are when your work is under pressure.',
  },
  ai_profile: {
    eyebrow: 'AI Assessment',
    title: 'Your AI Profile',
    description: 'How AI should support your working style, judgment, and execution.',
    detail_title: 'Your AI Profile',
    detail_quote: 'A practical map for where AI amplifies you without adding noise.',
  },
  gaps: {
    eyebrow: 'AI Gap Analysis',
    title: 'Your Gaps',
    description: 'Readiness deltas, friction points, and what to tighten first.',
    detail_title: 'Your Gaps',
    detail_quote: 'The capability gaps that matter most right now.',
  },
  readiness: {
    eyebrow: 'AI Insight Report',
    title: 'AI Readiness',
    description: 'Readiness routing, resource guidance, and curriculum direction.',
    detail_title: 'AI Readiness',
    detail_quote: 'A clear read on readiness, not a generic scorecard.',
  },
  my_concierge: {
    eyebrow: 'MyConcierge',
    title: 'Your Partner',
    description: 'Role-fit guidance, direction design, and confidence-building support.',
    detail_title: 'MyConcierge',
    detail_quote: 'A strategic guidance rail for direction, role fit, and next moves.',
  },
  cjs_execution: {
    eyebrow: 'ConciergeJobSearch',
    title: 'ConciergeJobSearch',
    description: 'Resume, strategy, outreach, and interview execution in one rail.',
    detail_title: 'ConciergeJobSearch',
    detail_quote: 'A focused execution rail for promotion, search, and positioning work.',
  },
  plan: {
    eyebrow: 'AI Training Plan',
    title: 'Your Plan',
    description: 'A 72-hour board of momentum followed by a clear sprint.',
    detail_title: 'Your Plan',
    detail_quote: 'The board of momentum for the next 72 hours and the sprint beyond.',
  },
  assets: {
    eyebrow: 'Bespoke AI Course',
    title: 'Your Assets',
    description: 'Resume versions, drafts, scripts, and traceable execution artifacts.',
    detail_title: 'Your Assets',
    detail_quote: 'The working set of materials that turns strategy into visible signal.',
  },
  roadmap: {
    eyebrow: 'Operator Roadmap',
    title: 'Roadmap',
    description: 'Validation, sequencing, and delivery status for the product team.',
    detail_title: 'Roadmap',
    detail_quote: 'An operator surface for backlog truth, validation, and sequencing.',
  },
};

export const DEFAULT_BRAND_CONFIG = {
  identity: {
    company_name: 'Concierge Career Services',
    suite_name: 'SkillSync Ai Premier',
    product_name: 'SkillSync Ai',
    logo_url: '',
    logo_alt: 'SkillSync Ai logo',
    header_context: 'Career Concierge OS',
  },
  colors: {
    accent: '#8DD9BF',
    accent_dark: '#5FAF95',
    ink: '#28211E',
    page_background: '#F4F1EB',
    surface_background: '#FBF8F2',
    grid_line: '#D8D0C3',
    overlay_background: '#28211E',
    overlay_text: '#F7F1E8',
  },
  hierarchy: {
    header_scale: 'standard',
    subheader_scale: 'standard',
    body_density: 'standard',
    tile_emphasis: 'balanced',
    overlay_style: 'editorial',
  },
  toggles: {
    show_logo_mark: true,
    show_suite_kicker: true,
    show_module_indices: true,
    show_module_status: true,
    show_tile_descriptions: true,
    show_detail_quotes: true,
    show_grid_glow: true,
    show_home_callout: true,
  },
  copy: {
    prologue_quote: 'Most careers do not collapse. They quietly stall.',
    prologue_description:
      'This suite is designed to keep you moving with premium pacing and clear next actions. No tests. No chaos. Just a calibrated plan.',
    prologue_enter_label: 'Enter',
    home_kicker: 'SkillSync Ai Premier',
    home_title: 'Start with intake. Everything else unlocks as soon as we calibrate your profile and generate your Brief.',
    home_description:
      'The editorial grid adapts to intent, tier, and pacing preferences so the suite feels guided instead of generic.',
    home_callout_label: 'Start Here',
    home_callout_value: 'Smart Start Intake unlocks the suite graph.',
    free_tier_notice:
      'Foundation access includes Intake, Episodes, and AI Readiness. Upgrade unlocks MyConcierge, ConciergeJobSearch, and the full artifact suite.',
    module_ready_label: 'Ready',
    module_locked_label: 'Locked',
    mobile_focus_hint: 'Tap again to open',
    modal_meta_label: 'Module',
    modal_account_label: 'Account',
  },
  modules: DEFAULT_BRAND_MODULES,
};

export const cloneBrandConfig = () => JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG));

export const getBrandModuleCopy = (brandConfig, moduleId) => {
  const selected = brandConfig?.modules?.[moduleId];
  if (selected && typeof selected === 'object') {
    return {
      ...DEFAULT_BRAND_MODULES[moduleId],
      ...selected,
    };
  }
  return { ...DEFAULT_BRAND_MODULES[moduleId] };
};

export const hexToRgba = (hex, alpha) => {
  const value = String(hex ?? '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(141, 217, 191, ${alpha})`;
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
