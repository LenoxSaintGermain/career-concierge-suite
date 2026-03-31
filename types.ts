export type SuiteModuleId =
  | 'intake'
  | 'episodes'
  | 'tv'
  | 'flash_cards'
  | 'brief'
  | 'suite_distilled'
  | 'profile'
  | 'ai_profile'
  | 'gaps'
  | 'readiness'
  | 'my_concierge'
  | 'events'
  | 'telescope'
  | 'team'
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

export interface IntakeFormData {
  intent_type?: 'STAY_SHARP' | 'SPECIFIC_MOVE' | 'DESIGN_DIRECTION';
  outcome_goals?: string[];
  comp_level?: string;
  current_title?: string;
  target_title?: string;
  salary_range?: string;
  benefits_timing?: 'NOT_YET' | 'UPCOMING' | 'IN_PROGRESS';
  ai_usage_frequency?: 'RARELY_OR_NEVER' | 'OCCASIONALLY' | 'REGULARLY' | 'DAILY' | string;
  enterprise_ai_context?: string[];
  job_description?: string;
  resume_url?: string;
  align_bio_on_upload?: boolean;
  foundational_interests?: string[];
  advanced_interests?: string[];
  learning_modality?: string[];
  direction_aim?: string;
  pressure_breaks?: string;
  momentum_source?: string;
  constraints?: string;
  industry?: string;
  tone_preference?: string[];
  timeline_urgency?: string;
  target_sector?: string;
  target_companies?: string[];
  comp_range?: string;
  comp_posture?: string;
  proof_artifacts?: string[];
  quantified_outcomes?: string[];
  role_ownership?: string;
  suppressor_signals?: string[];
  ai_proficiency_self_report?: string;
  voice_session_id?: string;
  voice_session_completed?: boolean;
  voice_extracted_fields?: string[];
  synthesis_approval?: boolean;
}

export type IntakeAnswerValue = string | string[] | boolean;
export type IntakeAnswers = Partial<IntakeFormData> & Record<string, IntakeAnswerValue | undefined>;

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

export type DnaEvidenceClass = 'observed' | 'inferred' | 'external';
export type DnaSignalTone = 'strong' | 'watch' | 'risk';
export type DnaConfidenceBand = 'high' | 'medium' | 'low';

export interface DnaUrgencyTask {
  id: string;
  label: string;
  done: boolean;
  timebox?: 'do_now' | '48h' | '72h';
  rationale?: string;
}

export interface DnaSignalStripItem {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone: DnaSignalTone;
}

export interface DnaSignalBreakdownItem {
  id: string;
  label: string;
  score: number;
  tone: DnaSignalTone;
  rationale: string;
  evidence: DnaEvidenceClass;
}

export interface DnaTrajectoryPoint {
  label: string;
  score: number;
}

export interface DnaMarketSignal {
  composite_score: number;
  momentum_label: string;
  trajectory_type: 'history' | 'projection';
  trajectory_basis: string;
  trajectory: DnaTrajectoryPoint[];
  breakdown: DnaSignalBreakdownItem[];
}

export interface DnaMarketDemandEnvironment {
  id: string;
  label: string;
  demand_score: number;
  fit_score: number;
  compensation_band: string;
  hiring_posture: string;
  rationale: string;
  evidence: DnaEvidenceClass;
}

export interface DnaCompensationLadderRung {
  id: string;
  label: string;
  grade: string;
  detail: string;
}

export interface DnaSourceRegistryEntry {
  id: string;
  label: string;
  authority: 'government' | 'public_market' | 'company' | 'client' | 'internal_artifact';
  url?: string;
  as_of: string;
  coverage: string;
}

export interface DnaEvidenceNode {
  id: string;
  title: string;
  class: DnaEvidenceClass;
  source_label: string;
  source_type: 'government' | 'labor_market' | 'company' | 'posting' | 'intake' | 'artifact';
  source_url?: string;
  observed_at?: string;
  statement: string;
  confidence: DnaConfidenceBand;
}

export interface DnaReportTicker {
  generated_at: string;
  model_version: string;
  evidence_nodes: number;
  confidence_rating: string;
  next_review_date: string;
  source_snapshot_date: string;
  source_count: number;
  update_cadence: string;
}

export interface BriefContent {
  learned: string[]; // 3 bullets
  needle: string[]; // 3 bullets
  next_72_hours: DnaUrgencyTask[];
  adaptation_verdict?: string;
  thesis?: string;
  primary_opportunity?: string;
  primary_risk?: string;
  recommended_habitat?: string;
  compensation_posture?: string;
  executive_summary?: string[];
  market_receipt?: string[];
  evidence_ledger?: {
    observed: string[];
    inferred: string[];
    external: string[];
  };
  signal_strip?: DnaSignalStripItem[];
  market_signal?: DnaMarketSignal;
  compensation_ladder?: DnaCompensationLadderRung[];
  report_ticker?: DnaReportTicker;
}

export interface DnaMarker {
  id: string;
  label: string;
  score: number;
  band: 'emerging' | 'viable' | 'strong' | 'distinguished';
  interpretation: string;
  evidence: DnaEvidenceClass;
}

export interface DnaFinding {
  label: string;
  finding: string;
  implication: string;
  evidence: DnaEvidenceClass;
}

export interface DnaEvidenceNote {
  class: DnaEvidenceClass;
  source_label: string;
  note: string;
  source_url?: string;
  confidence?: DnaConfidenceBand;
}

export interface CompensationPosture {
  market_value_range: string;
  target_ask: string;
  ask_justification_receipt: string[];
  high_pay_habitats: string[];
  underpay_risk_habitats: string[];
  negotiation_strategy: string[];
}

export type SuiteDistilledStrategyStatus = 'internal_strategy_draft' | 'market_validated' | 'advisor_revised';
export type SuiteDistilledCommandCenterStatus = 'steady' | 'recalibrating' | 'signal_shift' | 'awaiting_proof';
export type SuiteDistilledMatrixState = 'Leader' | 'Challenger' | 'Specialist' | 'At Risk';

export interface SuiteDistilledMarketFrame {
  market_sentiment_summary: string;
  hot_skill_premiums: string[];
  restructuring_or_cooling_signals: string[];
  what_changed: string;
  freshness_note: string;
}

export interface SuiteDistilledPositioningMatrix {
  current_state: SuiteDistilledMatrixState;
  rationale: string;
  demand_strength: string;
  proof_strength: string;
  narrative_strength: string;
  next_state_target: string;
}

export interface SuiteDistilledCareerLaneRecommendation {
  primary_lane: string;
  secondary_lane?: string;
  why_this_lane_now: string;
  avoid_for_now?: string[];
}

export interface SuiteDistilledSurgicalAiPlaybooks {
  proxy_interview_playbook: string[];
  narrative_shaping_playbook: string[];
  recruiter_language_playbook: string[];
  evidence_hardening_playbook: string[];
}

export interface SuiteDistilledLivingSequence {
  current_branch: string;
  alternate_branch?: string;
  unlock_conditions: string[];
  proof_targets: string[];
  recalibration_triggers: string[];
  next_72_hours: DnaUrgencyTask[];
  next_2_weeks: DnaUrgencyTask[];
}

export interface SuiteDistilledAdvisorBridge {
  what_changed_since_last_review: string[];
  needs_advisor_judgment: string[];
  can_be_ai_delegated: string[];
  strategic_questions: string[];
}

export interface SuiteDistilledEvidenceEntry {
  label: string;
  class: DnaEvidenceClass;
  note: string;
  source_ref?: string;
}

export interface ProfileContent {
  strengths: string[];
  patterns: string[];
  leverage: string[];
  report_version?: string;
  generated_at?: string;
  section_order?: string[];
  thesis?: string;
  target_environment?: string;
  case_summary?: {
    current_identity: string;
    target_identity: string;
    constraints: string[];
    report_thesis: string;
  };
  genome_markers?: DnaMarker[];
  behavioral_propensities?: DnaFinding[];
  pressure_response?: DnaFinding[];
  environmental_fit?: {
    advantaged_in: string[];
    punished_in: string[];
    adjacency_paths: string[];
    recommended_habitat: string[];
  };
  market_climate?: {
    summary: string;
    national_signals: string[];
    occupation_signals: string[];
    geography_signals: string[];
    company_posture_notes: string[];
  };
  compensation_position?: CompensationPosture;
  signal_strip?: DnaSignalStripItem[];
  market_signal?: DnaMarketSignal;
  market_demand_analysis?: {
    summary: string;
    environments: DnaMarketDemandEnvironment[];
  };
  compensation_ladder?: DnaCompensationLadderRung[];
  report_ticker?: DnaReportTicker;
  extinction_risks?: string[];
  adaptive_assets?: string[];
  lean_into?: string[];
  let_go?: string[];
  build_next?: string[];
  evolution_path_90_days?: string[];
  source_registry?: DnaSourceRegistryEntry[];
  evidence_nodes?: DnaEvidenceNode[];
  evidence_notes?: DnaEvidenceNote[];
}

export interface SuiteDistilledContent {
  what_i_learned: string[];
  what_needs_to_happen: string[];
  next_to_do: DnaUrgencyTask[];
  title?: string;
  subtitle?: string;
  strategy_status?: SuiteDistilledStrategyStatus;
  command_center_status?: SuiteDistilledCommandCenterStatus;
  strategy_thesis?: string;
  current_position?: string;
  future_alpha?: string;
  market_frame?: SuiteDistilledMarketFrame;
  positioning_matrix?: SuiteDistilledPositioningMatrix;
  career_lane_recommendation?: SuiteDistilledCareerLaneRecommendation;
  surgical_ai_playbooks?: SuiteDistilledSurgicalAiPlaybooks;
  living_sequence?: SuiteDistilledLivingSequence;
  advisor_bridge?: SuiteDistilledAdvisorBridge;
  evidence_ledger?: SuiteDistilledEvidenceEntry[];
}

export interface SwatAgent {
  codename: string;
  title: string;
  status: 'working' | 'idle' | 'awaiting_review';
  current_mission_id: string | null;
  last_active_at: string;
}

export interface MissionProposedChange {
  field: string;
  before: string;
  after: string;
}

export interface Mission {
  id: string;
  agent_codename: string;
  title: string;
  target_artifact: string;
  status: 'in_progress' | 'ready_for_review' | 'auto_applied' | 'accepted' | 'dismissed';
  confidence: number;
  rationale: string;
  proposed_changes: MissionProposedChange[];
  created_at: string;
  resolved_at: string | null;
  user_note: string | null;
}

export interface AIProfileContent {
  positioning: string;
  how_to_use_ai: string[];
  guardrails: string[];
  stance?: 'delegator' | 'copilot';
  confidence_thresholds?: {
    auto_apply: number;
    review: number;
  };
  squad?: SwatAgent[];
  missions?: Mission[];
}

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low' | 'closed';
export type GapCategory = 'near_term' | 'target_role' | 'constraint';

export interface Gap {
  id: string;
  title: string;
  detail: string;
  category: GapCategory;
  severity: GapSeverity;
  urgency: number;
  days_unactioned: number;
  agent_codename?: string;
  agent_status?: 'investigating' | 'recommendation_ready' | 'addressed';
  addressed: boolean;
  addressed_at?: string;
}

export interface ReadinessSegments {
  awareness: number;
  skill_building: number;
  application: number;
  mastery: number;
}

export interface GapsContent {
  near_term: string[];
  for_target_role: string[];
  constraints: string[];
  gap_stack?: Gap[];
  readiness_score?: number;
  readiness_segments?: ReadinessSegments;
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
  asset_kind?: 'uploaded_file' | 'intake_reference';
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  extraction_status?: 'parsed' | 'unsupported' | 'failed' | 'not_applicable';
  text_char_count?: number;
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
  analysis_scope?: 'resume_file' | 'intake_reference';
  source_label?: string;
  limitations?: string[];
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
  storage_provider?: 'gcs' | 'gemini_uri' | 'none';
  storage_path?: string;
  source_url?: string;
}

export interface GeneratedMediaPack {
  episode_id: string;
  narrative: string;
  generated_at: string;
  degraded: boolean;
  job_id?: string;
  manifest_id?: string;
  pipeline_status?: 'queued' | 'degraded' | 'completed';
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

export interface CuratedMediaResolutionGap {
  need: string;
  classification: 'reusable_kit' | 'bespoke';
  reason: string;
}

export interface CuratedMediaResolutionEpisode {
  episode_id: string;
  title: string;
  objective: string;
  coverage: 'reused' | 'mixed' | 'bespoke_only' | 'no_library_match';
  matched_asset_ids: string[];
  matched_asset_titles: string[];
  matched_tags: string[];
  unmatched_reusable_tags: string[];
  gap_analysis: CuratedMediaResolutionGap[];
}

export interface CuratedMediaResolutionSummary {
  resolved_episode_count: number;
  reused_asset_count: number;
  reusable_gap_count: number;
  bespoke_gap_count: number;
}

export interface CuratedMediaResolution {
  strategy: 'library_first';
  status: 'plan_backed' | 'no_plan';
  surface: MediaJourneySurface;
  plan_id: string | null;
  resolved_at: string;
  summary: CuratedMediaResolutionSummary;
  episodes: CuratedMediaResolutionEpisode[];
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
  resolver?: CuratedMediaResolution | null;
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
  professional_dna: {
    enabled: boolean;
    base_model: string;
    research_model: string;
    prompt_appendix: string;
    enabled_sections: string[];
    section_order: string[];
    company_posture_notes_enabled: boolean;
    research_domains: string[];
    refresh_window_days: number;
    hero_video_url?: string;
    hero_video_title?: string;
    hero_autoplay_muted?: boolean;
    hero_loop?: boolean;
    hero_fallback_image_url?: string;
    hero_visible?: boolean;
    journey_guide_video_provider?: 'youtube' | 'vimeo' | 'direct';
    journey_guide_video_id?: string;
    journey_guide_video_url?: string;
    journey_guide_video_title?: string;
    voice_agent_enabled?: boolean;
    voice_agent_persona?: string;
    voice_arc_sections?: string[];
    voice_model?: 'elevenlabs_ghost' | 'gemini_live';
    voice_agent_voice_id?: string;
    voice_transcription_visible?: boolean;
    voice_to_form_autofill?: boolean;
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
    provider: 'sesame' | 'gemini_live' | 'elevenlabs';
    public_panel_provider: 'gemini_live' | 'elevenlabs';
    sesame_enabled: boolean;
    api_url: string;
    speaker: string;
    gemini_live_model: string;
    gemini_voice_name: string;
    max_audio_length_ms: number;
    temperature: number;
    narration_style: string;
    gemini_input_audio_transcription_enabled: boolean;
    gemini_output_audio_transcription_enabled: boolean;
    gemini_affective_dialog_enabled: boolean;
    gemini_proactive_audio_enabled: boolean;
    gemini_activity_handling: 'interrupt' | 'wait';
    gemini_thinking_enabled: boolean;
    gemini_thinking_budget: number;
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
  professional_dna: Pick<
    AppConfig['professional_dna'],
    | 'hero_video_url'
    | 'hero_video_title'
    | 'hero_autoplay_muted'
    | 'hero_loop'
    | 'hero_fallback_image_url'
    | 'hero_visible'
    | 'journey_guide_video_provider'
    | 'journey_guide_video_id'
    | 'journey_guide_video_url'
    | 'journey_guide_video_title'
    | 'voice_agent_enabled'
    | 'voice_model'
    | 'voice_transcription_visible'
    | 'voice_to_form_autofill'
  >;
  voice: {
    elevenlabs_enabled: boolean;
    elevenlabs_agent_id: string;
    active_panel: 'gemini_live' | 'elevenlabs';
    gemini_live_model: string;
  };
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
    elevenlabs_api_configured: boolean;
    elevenlabs_agent_configured: boolean;
    elevenlabs_branch_configured: boolean;
    manus_configured: boolean;
    manus_api_url: string;
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
  bookings: {
    pending_count: number;
    items: AdminConciergeRequest[];
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
    sesame_enabled: boolean;
    live_model: string;
    gemini_input_audio_transcription_enabled: boolean;
    gemini_output_audio_transcription_enabled: boolean;
    gemini_affective_dialog_enabled: boolean;
    gemini_proactive_audio_enabled: boolean;
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

export interface AdminConciergeRequest {
  id: string;
  request_kind: 'public_ai_concierge' | 'smart_start_booking';
  status: 'new' | 'reviewed' | 'scheduled';
  name: string;
  email: string;
  company?: string;
  goal: string;
  service_interest?: string;
  resume_link?: string;
  preferred_timing: string;
  preferred_date?: string;
  preferred_time?: string;
  preferred_timezone?: string;
  source: string;
  client_uid?: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminMediaPipelineAssetSummary {
  kind: 'image' | 'video';
  status: string;
  model: string;
  storage_provider: string;
  storage_path?: string;
  source_url?: string;
  note?: string;
}

export interface AdminMediaPipelineJobSummary {
  client_uid: string;
  client_name: string;
  client_email: string;
  job_id: string;
  manifest_id: string;
  episode_id: string;
  status: string;
  trigger: string;
  runner: string;
  generated_at: string | null;
  updated_at: string | null;
  asset_count: number;
  queued_asset_count: number;
  attempt_count: number;
  worker_ready: boolean;
  degraded: boolean;
  review_state: string;
  retry_requested_count: number;
  retry_requested_at: string | null;
  assets: AdminMediaPipelineAssetSummary[];
}

export interface AdminMediaPipelineManifestSummary {
  client_uid: string;
  client_name: string;
  client_email: string;
  manifest_id: string;
  job_id: string;
  episode_id: string;
  pipeline_status: string;
  review_state: string;
  generated_at: string | null;
  updated_at: string | null;
  client_payload_asset_count: number;
  reusable_gap_count: number;
  bespoke_gap_count: number;
  final_asset_count: number;
  image_prompt: string;
  video_prompt: string;
  assets: AdminMediaPipelineAssetSummary[];
}

export interface AdminMediaPipelineOverview {
  generated_at: string;
  summary: {
    total_jobs: number;
    queued_jobs: number;
    worker_ready_jobs: number;
    degraded_jobs: number;
    completed_jobs: number;
    retry_requested_jobs: number;
    manifests_needing_review: number;
    reusable_gap_count: number;
    bespoke_gap_count: number;
  };
  jobs: AdminMediaPipelineJobSummary[];
  manifests: AdminMediaPipelineManifestSummary[];
  warnings: string[];
}

export interface OrchestrationIntentRoute {
  intent: ClientIntent;
  primary_roles: string[];
  handoff_order: string[];
  premium_human_handoff: boolean;
}

export interface OrchestrationPolicy {
  policy_id: string;
  version: string;
  current_stack: string[];
  paid_roles: string[];
  free_roles: string[];
  approval_triggers: string[];
  evaluation_signals: string[];
  intent_routes: OrchestrationIntentRoute[];
}

export interface AdminOrchestrationRunSummary {
  client_uid: string;
  client_name: string;
  client_email: string;
  run_id: string;
  started_by_role: string;
  trigger: string;
  status: string;
  intent: string;
  tier: string;
  summary: string;
  confidence: number;
  approval_state: string;
  next_roles: string[];
  evidence_refs: string[];
  artifact_refs: string[];
  policy_flags: string[];
  recommended_actions: string[];
  linked_request_id?: string;
  updated_at: string | null;
}

export interface AdminOrchestrationOverview {
  generated_at: string;
  summary: {
    role_count: number;
    run_count: number;
    average_confidence: number;
    approval_required_runs: number;
    low_confidence_runs: number;
    flagged_runs: number;
    human_followup_runs: number;
  };
  policy: OrchestrationPolicy;
  registry: AgentDefinition[];
  runs: AdminOrchestrationRunSummary[];
}

export interface AdminSamplePersona {
  id: string;
  name: string;
  email: string;
  uid: string;
  tier: string;
  archetype: string;
  intent: ClientIntent;
  focus: FocusPreference;
  pace: PacePreference;
  launch_ready: boolean;
  auth_user_exists: boolean;
  client_exists: boolean;
  hydrated: boolean;
  intro_seen: boolean;
  intake_completed: boolean;
  artifact_count: number;
  interaction_count: number;
  media_job_count: number;
  last_hydrated_at: string | null;
  last_updated_at: string | null;
  proof_captured: boolean;
  proof_updated_at: string | null;
  launch_path: string;
}

export interface AdminSamplePersonaOverview {
  generated_at: string;
  environment_label: string;
  launch_mode: 'session_tab';
  shared_password: string;
  personas: AdminSamplePersona[];
}

export interface AdminSamplePersonaLaunch {
  persona_id: string;
  launch_url: string;
  warning: string;
}

export interface VoiceSynthesisResponse {
  provider: 'sesame' | 'gemini_live';
  mime_type: string;
  audio_base64: string;
  generated_at: string;
  transcript?: string;
}

export interface GeminiLiveTokenResponse {
  token_name: string;
  model: string;
  voice_name: string;
  client_name?: string;
  activity_handling: 'interrupt' | 'wait';
  input_transcription_enabled: boolean;
  output_transcription_enabled: boolean;
  affective_dialog_enabled: boolean;
  proactive_audio_enabled: boolean;
  issued_at: string;
  expires_at: string;
}

export interface ElevenLabsSessionResponse {
  agent_id: string;
  signed_url: string;
  user_id: string;
  client_name?: string;
  issued_at: string;
}

export interface IntakeTranscriptExtractionResponse {
  extracted: Partial<IntakeFormData>;
  extracted_fields: string[];
  model: string;
  fallback?: boolean;
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
