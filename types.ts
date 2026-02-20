export type SuiteModuleId =
  | 'intake'
  | 'episodes'
  | 'brief'
  | 'profile'
  | 'ai_profile'
  | 'gaps'
  | 'plan'
  | 'assets';
export type SuiteModuleKind = 'flow' | 'feed' | 'artifact' | 'collection';

export interface SuiteModule {
  id: SuiteModuleId;
  index: string; // e.g. "01"
  title: string;
  subtitle: string;
  kind: SuiteModuleKind;
  relatedIds?: SuiteModuleId[];
}

export type ClientIntent = 'current_role' | 'target_role' | 'not_sure';
export type PacePreference = 'straight' | 'standard' | 'story';
export type FocusPreference = 'job_search' | 'skills' | 'leadership';

export type IntakeAnswers = Record<string, string>;

export interface ClientPreferences {
  pace: PacePreference;
  focus: FocusPreference;
}

export interface ClientDoc {
  uid: string;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp

  intro_seen_at?: any; // Firestore Timestamp

  intent?: ClientIntent;
  preferences?: ClientPreferences;
  intake?: {
    answers: IntakeAnswers;
    completed_at?: any; // Firestore Timestamp
  };
}

export type ArtifactType = 'brief' | 'profile' | 'ai_profile' | 'gaps' | 'plan';

export interface BriefContent {
  learned: string[]; // 3 bullets
  needle: string[]; // 3 bullets
  next_72_hours: { id: string; label: string; done: boolean }[];
}

export interface ProfileContent {
  strengths: string[];
  patterns: string[];
  leverage: string[];
}

export interface AIProfileContent {
  positioning: string;
  how_to_use_ai: string[];
  guardrails: string[];
}

export interface GapsContent {
  near_term: string[];
  for_target_role: string[];
  constraints: string[];
}

export interface PlanContent {
  next_72_hours: { id: string; label: string; done: boolean }[];
  next_2_weeks: { goal: string; cadence: string[] };
  needs_from_you: string[];
}

export interface BingeEpisode {
  episode_id: string;
  title: string;
  hook_card: string;
  lesson_swipes: string[];
  challenge_terminal: {
    prompt: string;
    placeholder: string;
  };
  reward_asset: string;
  cliffhanger: string;
  art_direction?: {
    image_prompt?: string;
    video_prompt?: string;
    audio_prompt?: string;
    recommended_models?: { kind: string; model: string; note?: string }[];
  };
}

export interface AppConfig {
  generation: {
    suite_model: string;
    binge_model: string;
    suite_temperature: number;
    binge_temperature: number;
  };
  prompts: {
    suite_appendix: string;
    binge_appendix: string;
  };
  ui: {
    show_prologue: boolean;
    episodes_enabled: boolean;
  };
  safety: {
    tone_guard_enabled: boolean;
  };
}

export interface PublicConfig {
  ui: AppConfig['ui'];
}

export interface ArtifactDoc<T = unknown> {
  id: string; // Firestore document id
  type: ArtifactType;
  title: string;
  version: number;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  content: T;
}
