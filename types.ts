export type SuiteModuleId =
  | 'intake'
  | 'episodes'
  | 'brief'
  | 'suite_distilled'
  | 'profile'
  | 'ai_profile'
  | 'gaps'
  | 'readiness'
  | 'cjs_execution'
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

export type IntakeAnswers = Record<string, string | string[] | boolean>;

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

export type ArtifactType =
  | 'brief'
  | 'suite_distilled'
  | 'profile'
  | 'ai_profile'
  | 'gaps'
  | 'readiness'
  | 'cjs_execution'
  | 'plan';

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

export interface SuiteDistilledContent {
  what_i_learned: string[];
  what_needs_to_happen: string[];
  next_to_do: { id: string; label: string; done: boolean }[];
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

export interface ReadinessContent {
  executive_overview: string[];
  from_awareness_to_action: string[];
  targeted_ai_development_priorities: string[];
  technical_development_areas: string[];
  tier_recommendation: 'Foundation' | 'Select' | 'Premier';
}

export interface CjsExecutionContent {
  intent_summary: string;
  stages: {
    step: number;
    title: string;
    status: 'ready' | 'planned' | 'blocked';
    description: string;
  }[];
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

export interface GeneratedMediaAsset {
  kind: 'image' | 'video';
  model: string;
  prompt: string;
  status: 'generated' | 'queued' | 'unavailable';
  note?: string;
  image_data_url?: string;
  video_operation_name?: string;
  video_done?: boolean;
  video_uri?: string;
}

export interface GeneratedMediaPack {
  episode_id: string;
  narrative: string;
  generated_at: string;
  degraded: boolean;
  assets: GeneratedMediaAsset[];
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
    rom_appendix: string;
    live_appendix: string;
    art_director_appendix: string;
  };
  ui: {
    show_prologue: boolean;
    episodes_enabled: boolean;
  };
  operations: {
    cjs_enabled: boolean;
    onboarding_email_enabled: boolean;
    curriculum_code: string;
    intro_course_offer: string;
  };
  media: {
    enabled: boolean;
    image_model: string;
    video_model: string;
    image_style: string;
    video_style: string;
    narrative_lens: string;
    image_aspect_ratio: string;
    video_aspect_ratio: string;
    video_duration_seconds: number;
    video_generate_audio: boolean;
    auto_generate_on_episode: boolean;
  };
  voice: {
    enabled: boolean;
    provider: 'sesame' | 'gemini_live';
    api_url: string;
    speaker: string;
    gemini_live_model: string;
    gemini_voice_name: string;
    max_audio_length_ms: number;
    temperature: number;
    narration_style: string;
    live_vad_silence_ms: number;
    live_vad_prefix_padding_ms: number;
    live_vad_start_sensitivity: 'high' | 'low';
    live_vad_end_sensitivity: 'high' | 'low';
  };
  safety: {
    tone_guard_enabled: boolean;
  };
}

export interface PublicConfig {
  ui: AppConfig['ui'];
  operations: Pick<AppConfig['operations'], 'cjs_enabled'>;
}

export interface VoiceSynthesisResponse {
  provider: 'sesame' | 'gemini_live';
  mime_type: string;
  audio_base64: string;
  generated_at: string;
}

export interface GeminiLiveTokenResponse {
  token_name: string;
  model: string;
  voice_name: string;
  client_name?: string;
  issued_at: string;
  expires_at: string;
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
