export type SuiteModuleId =
  | 'intake'
  | 'episodes'
  | 'brief'
  | 'suite_distilled'
  | 'profile'
  | 'ai_profile'
  | 'gaps'
  | 'readiness'
  | 'my_concierge'
  | 'cjs_execution'
  | 'plan'
  | 'assets'
  | 'roadmap';
export type SuiteModuleKind = 'flow' | 'feed' | 'artifact' | 'collection' | 'admin';

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
  email?: string;
  display_name?: string;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp

  intro_seen_at?: any; // Firestore Timestamp

  intent?: ClientIntent;
  preferences?: ClientPreferences;
  intake?: {
    answers: IntakeAnswers;
    completed_at?: any; // Firestore Timestamp
  };
  demo_profile?: {
    id?: string;
    name?: string;
    archetype?: string;
    tier?: string;
    hydrated?: boolean;
    hydrated_at?: string;
    source?: string;
  };
  account?: {
    tier?: string;
    status?: string;
    hydrated?: boolean;
    hydrated_at?: string;
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
  | 'plan'
  | 'resume_review'
  | 'search_strategy';

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

export interface CjsAsset {
  id: string;
  type: 'resume' | 'strategy' | 'cover_letter' | 'other';
  label: string;
  status: 'draft' | 'active' | 'archived';
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  source_url?: string;
  storage_path?: string;
  storage_provider?: 'gcs' | 'external_url' | 'none';
  target_role?: string;
  notes?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ResumeReviewContent {
  summary: string;
  role_alignment_score: number;
  strengths: string[];
  gaps: string[];
  rewrite_focus: string[];
}

export interface SearchStrategyContent {
  headline: string;
  channels: string[];
  weekly_actions: string[];
  proof_points: string[];
}

export type InteractionStatus = 'logged' | 'pending_approval' | 'approved' | 'rejected';

export interface InteractionLog {
  id: string;
  type: string;
  title: string;
  summary: string;
  status: InteractionStatus;
  requires_approval: boolean;
  next_actions: string[];
  client_uid?: string;
  client_email?: string;
  client_name?: string;
  source?: string;
  decided_by?: string;
  decision_note?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AgentDefinition {
  role_id: string;
  title: string;
  objective: string;
  reads: string[];
  writes: string[];
  approval_required: boolean;
  access_model: 'read_scoped' | 'read_write_scoped';
  policy_version: string;
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

export type MediaPlatform =
  | 'auto'
  | 'youtube'
  | 'vimeo'
  | 'tiktok'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'loom'
  | 'direct'
  | 'other';

export type MediaSourceKind = 'single' | 'playlist';
export type MediaAudience = 'all' | 'new_clients' | 'active_clients' | 'admins' | 'non_admins';
export type MediaJourneySurface = SuiteModuleId | 'suite_home' | 'pre_intake' | 'post_intake';

export interface CuratedMediaRule {
  audience: MediaAudience;
  intents: ClientIntent[];
  focuses: FocusPreference[];
  paces: PacePreference[];
  required_module_unlocks: SuiteModuleId[];
}

export interface CuratedMediaItem {
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  source_url: string;
  source_kind: MediaSourceKind;
  platform: MediaPlatform;
  thumbnail_url: string;
  tags: string[];
  priority: number;
  surfaces: MediaJourneySurface[];
  rule: CuratedMediaRule;
}

export interface ResolvedCuratedMediaItem extends CuratedMediaItem {
  platform_resolved: Exclude<MediaPlatform, 'auto'>;
  open_url: string;
  embed_url: string;
}

export interface CuratedMediaLibraryResponse {
  surface: MediaJourneySurface;
  generated_at: string;
  total_items?: number;
  matched_items?: number;
  context: {
    intake_complete: boolean;
    intent: ClientIntent | null;
    focus: FocusPreference | null;
    pace: PacePreference | null;
    is_admin: boolean;
  };
  items: ResolvedCuratedMediaItem[];
}

export type BrandHeaderScale = 'compact' | 'standard' | 'hero';
export type BrandSubheaderScale = 'tight' | 'standard' | 'airy';
export type BrandBodyDensity = 'tight' | 'standard' | 'relaxed';
export type BrandTileEmphasis = 'index' | 'balanced' | 'title';
export type BrandOverlayStyle = 'editorial' | 'minimal' | 'cinematic';

export interface BrandModuleCopy {
  eyebrow: string;
  title: string;
  description: string;
  detail_title: string;
  detail_quote: string;
}

export interface BrandConfig {
  identity: {
    company_name: string;
    suite_name: string;
    product_name: string;
    logo_url: string;
    logo_alt: string;
    header_context: string;
  };
  colors: {
    accent: string;
    accent_dark: string;
    ink: string;
    page_background: string;
    surface_background: string;
    grid_line: string;
    overlay_background: string;
    overlay_text: string;
  };
  hierarchy: {
    header_scale: BrandHeaderScale;
    subheader_scale: BrandSubheaderScale;
    body_density: BrandBodyDensity;
    tile_emphasis: BrandTileEmphasis;
    overlay_style: BrandOverlayStyle;
  };
  toggles: {
    show_logo_mark: boolean;
    show_suite_kicker: boolean;
    show_module_indices: boolean;
    show_module_status: boolean;
    show_tile_descriptions: boolean;
    show_detail_quotes: boolean;
    show_grid_glow: boolean;
    show_home_callout: boolean;
  };
  copy: {
    prologue_quote: string;
    prologue_description: string;
    prologue_enter_label: string;
    home_kicker: string;
    home_title: string;
    home_description: string;
    home_callout_label: string;
    home_callout_value: string;
    free_tier_notice: string;
    module_ready_label: string;
    module_locked_label: string;
    mobile_focus_hint: string;
    modal_meta_label: string;
    modal_account_label: string;
  };
  modules: Record<SuiteModuleId, BrandModuleCopy>;
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
  brand: BrandConfig;
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
    external_media_enabled: boolean;
    curated_library: CuratedMediaItem[];
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
  brand: AppConfig['brand'];
  operations: Pick<AppConfig['operations'], 'cjs_enabled'>;
}

export interface AdminSystemOverview {
  runtime: {
    project_id: string;
    region: string;
    service_name: string;
    revision: string;
    firestore_database_id: string;
    storage_bucket: string;
    gemini_configured: boolean;
    sesame_configured: boolean;
    admin_email_mode: 'open' | 'allowlist';
    admin_email_count: number;
    rom_version: string;
  };
  queue: {
    pending_count: number;
    client_count: number;
    hydrated_account_count: number;
    items: InteractionLog[];
    warning?: string;
  };
  agents: {
    count: number;
    approval_required_count: number;
    write_scope_count: number;
    items: AgentDefinition[];
  };
  config_summary: {
    external_media_enabled: boolean;
    curated_library_count: number;
    curated_library_enabled_count: number;
    voice_enabled: boolean;
    voice_provider: string;
    live_model: string;
    suite_model: string;
    binge_model: string;
    image_model: string;
    video_model: string;
    episodes_enabled: boolean;
    cjs_enabled: boolean;
    tone_guard_enabled: boolean;
    onboarding_email_enabled: boolean;
    auto_generate_on_episode: boolean;
    suite_overlay_configured: boolean;
    binge_overlay_configured: boolean;
    rom_overlay_configured: boolean;
    live_overlay_configured: boolean;
    art_director_overlay_configured: boolean;
  };
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
