import { auth } from './firebase';
import {
  AdminMediaPipelineOverview,
  AdminOrchestrationOverview,
  AdminSamplePersonaLaunch,
  AdminSamplePersonaOverview,
  AdminSystemOverview,
  AppConfig,
  BrandBodyDensity,
  BrandConfig,
  BrandHeaderScale,
  BrandModuleCopy,
  BrandOverlayStyle,
  BrandSubheaderScale,
  BrandTileEmphasis,
  ClientIntent,
  CuratedMediaItem,
  FocusPreference,
  MediaAudience,
  MediaJourneySurface,
  MediaPlatform,
  MediaSourceKind,
  PacePreference,
  PublicConfig,
  SuiteModuleId,
} from '../types';
import {
  BRAND_BODY_DENSITIES,
  BRAND_HEADER_SCALES,
  BRAND_MODULE_IDS,
  BRAND_OVERLAY_STYLES,
  BRAND_SUBHEADER_SCALES,
  BRAND_TILE_EMPHASES,
  DEFAULT_BRAND_CONFIG,
} from '../config/brandSystem.js';
import { GEMINI_LIVE_MODEL_OPTIONS } from '../config/voiceRuntime.js';
import { resolveApiOrigin } from './apiOrigin';

export const getAdminApiOrigin = () => resolveApiOrigin();

const MODULE_IDS = [...BRAND_MODULE_IDS] as SuiteModuleId[];
const BRAND_DEFAULTS = DEFAULT_BRAND_CONFIG as BrandConfig;
const SURFACE_SET = new Set<MediaJourneySurface>([...MODULE_IDS, 'suite_home', 'pre_intake', 'post_intake']);
const PLATFORM_SET = new Set<MediaPlatform>([
  'auto',
  'youtube',
  'vimeo',
  'tiktok',
  'instagram',
  'linkedin',
  'x',
  'loom',
  'direct',
  'other',
]);
const SOURCE_KIND_SET = new Set<MediaSourceKind>(['single', 'playlist']);
const AUDIENCE_SET = new Set<MediaAudience>(['all', 'new_clients', 'active_clients', 'admins', 'non_admins']);
const INTENT_SET = new Set<ClientIntent>(['current_role', 'target_role', 'not_sure']);
const FOCUS_SET = new Set<FocusPreference>(['job_search', 'skills', 'leadership']);
const PACE_SET = new Set<PacePreference>(['straight', 'standard', 'story']);
const BRAND_HEADER_SCALE_SET = new Set<BrandHeaderScale>(BRAND_HEADER_SCALES as BrandHeaderScale[]);
const BRAND_SUBHEADER_SCALE_SET = new Set<BrandSubheaderScale>(BRAND_SUBHEADER_SCALES as BrandSubheaderScale[]);
const BRAND_BODY_DENSITY_SET = new Set<BrandBodyDensity>(BRAND_BODY_DENSITIES as BrandBodyDensity[]);
const BRAND_TILE_EMPHASIS_SET = new Set<BrandTileEmphasis>(BRAND_TILE_EMPHASES as BrandTileEmphasis[]);
const BRAND_OVERLAY_STYLE_SET = new Set<BrandOverlayStyle>(BRAND_OVERLAY_STYLES as BrandOverlayStyle[]);

const cleanList = (input: unknown): string[] =>
  Array.isArray(input)
    ? input.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];

const toMediaId = (value: unknown, index: number) => {
  const raw = String(value ?? '').trim();
  if (raw) return raw;
  return `media-${index + 1}`;
};

const normalizeHexColor = (value: unknown, fallback: string) => {
  const raw = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : fallback;
};

const normalizeBrandModuleCopy = (moduleId: SuiteModuleId, input: unknown): BrandModuleCopy => {
  const source = input && typeof input === 'object' ? (input as any) : {};
  const fallback = BRAND_DEFAULTS.modules[moduleId];
  return {
    eyebrow: String(source?.eyebrow ?? fallback.eyebrow).trim() || fallback.eyebrow,
    title: String(source?.title ?? fallback.title).trim() || fallback.title,
    description: String(source?.description ?? fallback.description).trim() || fallback.description,
    detail_title: String(source?.detail_title ?? fallback.detail_title).trim() || fallback.detail_title,
    detail_quote: String(source?.detail_quote ?? fallback.detail_quote).trim() || fallback.detail_quote,
  };
};

const normalizeBrandConfig = (input: unknown): BrandConfig => {
  const source = input && typeof input === 'object' ? (input as any) : {};
  const identity = source?.identity && typeof source.identity === 'object' ? source.identity : {};
  const colors = source?.colors && typeof source.colors === 'object' ? source.colors : {};
  const hierarchy = source?.hierarchy && typeof source.hierarchy === 'object' ? source.hierarchy : {};
  const toggles = source?.toggles && typeof source.toggles === 'object' ? source.toggles : {};
  const copy = source?.copy && typeof source.copy === 'object' ? source.copy : {};
  const modules = source?.modules && typeof source.modules === 'object' ? source.modules : {};

  const normalizedModules = MODULE_IDS.reduce((acc, moduleId) => {
    acc[moduleId] = normalizeBrandModuleCopy(moduleId, modules[moduleId]);
    return acc;
  }, {} as Record<SuiteModuleId, BrandModuleCopy>);

  return {
    identity: {
      company_name:
        String(identity?.company_name ?? BRAND_DEFAULTS.identity.company_name).trim() ||
        BRAND_DEFAULTS.identity.company_name,
      suite_name:
        String(identity?.suite_name ?? BRAND_DEFAULTS.identity.suite_name).trim() ||
        BRAND_DEFAULTS.identity.suite_name,
      product_name:
        String(identity?.product_name ?? BRAND_DEFAULTS.identity.product_name).trim() ||
        BRAND_DEFAULTS.identity.product_name,
      logo_url: String(identity?.logo_url ?? BRAND_DEFAULTS.identity.logo_url).trim(),
      logo_alt:
        String(identity?.logo_alt ?? BRAND_DEFAULTS.identity.logo_alt).trim() ||
        BRAND_DEFAULTS.identity.logo_alt,
      header_context:
        String(identity?.header_context ?? BRAND_DEFAULTS.identity.header_context).trim() ||
        BRAND_DEFAULTS.identity.header_context,
    },
    colors: {
      accent: normalizeHexColor(colors?.accent, BRAND_DEFAULTS.colors.accent),
      accent_dark: normalizeHexColor(colors?.accent_dark, BRAND_DEFAULTS.colors.accent_dark),
      ink: normalizeHexColor(colors?.ink, BRAND_DEFAULTS.colors.ink),
      page_background: normalizeHexColor(colors?.page_background, BRAND_DEFAULTS.colors.page_background),
      surface_background: normalizeHexColor(
        colors?.surface_background,
        BRAND_DEFAULTS.colors.surface_background
      ),
      grid_line: normalizeHexColor(colors?.grid_line, BRAND_DEFAULTS.colors.grid_line),
      overlay_background: normalizeHexColor(
        colors?.overlay_background,
        BRAND_DEFAULTS.colors.overlay_background
      ),
      overlay_text: normalizeHexColor(colors?.overlay_text, BRAND_DEFAULTS.colors.overlay_text),
    },
    hierarchy: {
      header_scale: BRAND_HEADER_SCALE_SET.has(hierarchy?.header_scale as BrandHeaderScale)
        ? (hierarchy.header_scale as BrandHeaderScale)
        : BRAND_DEFAULTS.hierarchy.header_scale,
      subheader_scale: BRAND_SUBHEADER_SCALE_SET.has(hierarchy?.subheader_scale as BrandSubheaderScale)
        ? (hierarchy.subheader_scale as BrandSubheaderScale)
        : BRAND_DEFAULTS.hierarchy.subheader_scale,
      body_density: BRAND_BODY_DENSITY_SET.has(hierarchy?.body_density as BrandBodyDensity)
        ? (hierarchy.body_density as BrandBodyDensity)
        : BRAND_DEFAULTS.hierarchy.body_density,
      tile_emphasis: BRAND_TILE_EMPHASIS_SET.has(hierarchy?.tile_emphasis as BrandTileEmphasis)
        ? (hierarchy.tile_emphasis as BrandTileEmphasis)
        : BRAND_DEFAULTS.hierarchy.tile_emphasis,
      overlay_style: BRAND_OVERLAY_STYLE_SET.has(hierarchy?.overlay_style as BrandOverlayStyle)
        ? (hierarchy.overlay_style as BrandOverlayStyle)
        : BRAND_DEFAULTS.hierarchy.overlay_style,
    },
    toggles: {
      show_logo_mark:
        typeof toggles?.show_logo_mark === 'boolean'
          ? toggles.show_logo_mark
          : BRAND_DEFAULTS.toggles.show_logo_mark,
      show_suite_kicker:
        typeof toggles?.show_suite_kicker === 'boolean'
          ? toggles.show_suite_kicker
          : BRAND_DEFAULTS.toggles.show_suite_kicker,
      show_module_indices:
        typeof toggles?.show_module_indices === 'boolean'
          ? toggles.show_module_indices
          : BRAND_DEFAULTS.toggles.show_module_indices,
      show_module_status:
        typeof toggles?.show_module_status === 'boolean'
          ? toggles.show_module_status
          : BRAND_DEFAULTS.toggles.show_module_status,
      show_tile_descriptions:
        typeof toggles?.show_tile_descriptions === 'boolean'
          ? toggles.show_tile_descriptions
          : BRAND_DEFAULTS.toggles.show_tile_descriptions,
      show_detail_quotes:
        typeof toggles?.show_detail_quotes === 'boolean'
          ? toggles.show_detail_quotes
          : BRAND_DEFAULTS.toggles.show_detail_quotes,
      show_grid_glow:
        typeof toggles?.show_grid_glow === 'boolean'
          ? toggles.show_grid_glow
          : BRAND_DEFAULTS.toggles.show_grid_glow,
      show_home_callout:
        typeof toggles?.show_home_callout === 'boolean'
          ? toggles.show_home_callout
          : BRAND_DEFAULTS.toggles.show_home_callout,
    },
    copy: {
      prologue_quote:
        String(copy?.prologue_quote ?? BRAND_DEFAULTS.copy.prologue_quote).trim() ||
        BRAND_DEFAULTS.copy.prologue_quote,
      prologue_description:
        String(copy?.prologue_description ?? BRAND_DEFAULTS.copy.prologue_description).trim() ||
        BRAND_DEFAULTS.copy.prologue_description,
      prologue_enter_label:
        String(copy?.prologue_enter_label ?? BRAND_DEFAULTS.copy.prologue_enter_label).trim() ||
        BRAND_DEFAULTS.copy.prologue_enter_label,
      home_kicker:
        String(copy?.home_kicker ?? BRAND_DEFAULTS.copy.home_kicker).trim() ||
        BRAND_DEFAULTS.copy.home_kicker,
      home_title:
        String(copy?.home_title ?? BRAND_DEFAULTS.copy.home_title).trim() ||
        BRAND_DEFAULTS.copy.home_title,
      home_description:
        String(copy?.home_description ?? BRAND_DEFAULTS.copy.home_description).trim() ||
        BRAND_DEFAULTS.copy.home_description,
      home_callout_label:
        String(copy?.home_callout_label ?? BRAND_DEFAULTS.copy.home_callout_label).trim() ||
        BRAND_DEFAULTS.copy.home_callout_label,
      home_callout_value:
        String(copy?.home_callout_value ?? BRAND_DEFAULTS.copy.home_callout_value).trim() ||
        BRAND_DEFAULTS.copy.home_callout_value,
      free_tier_notice:
        String(copy?.free_tier_notice ?? BRAND_DEFAULTS.copy.free_tier_notice).trim() ||
        BRAND_DEFAULTS.copy.free_tier_notice,
      module_ready_label:
        String(copy?.module_ready_label ?? BRAND_DEFAULTS.copy.module_ready_label).trim() ||
        BRAND_DEFAULTS.copy.module_ready_label,
      module_locked_label:
        String(copy?.module_locked_label ?? BRAND_DEFAULTS.copy.module_locked_label).trim() ||
        BRAND_DEFAULTS.copy.module_locked_label,
      mobile_focus_hint:
        String(copy?.mobile_focus_hint ?? BRAND_DEFAULTS.copy.mobile_focus_hint).trim() ||
        BRAND_DEFAULTS.copy.mobile_focus_hint,
      modal_meta_label:
        String(copy?.modal_meta_label ?? BRAND_DEFAULTS.copy.modal_meta_label).trim() ||
        BRAND_DEFAULTS.copy.modal_meta_label,
      modal_account_label:
        String(copy?.modal_account_label ?? DEFAULT_BRAND_CONFIG.copy.modal_account_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.modal_account_label,
    },
    modules: normalizedModules,
  } as BrandConfig;
};

const normalizeCuratedMediaItem = (input: unknown, index: number): CuratedMediaItem => {
  const source = input && typeof input === 'object' ? (input as any) : {};
  const sourceKind = String(source?.source_kind ?? '').trim();
  const platform = String(source?.platform ?? '').trim();
  const audience = String(source?.rule?.audience ?? '').trim();
  const intents = cleanList(source?.rule?.intents).filter((entry): entry is ClientIntent => INTENT_SET.has(entry as ClientIntent));
  const focuses = cleanList(source?.rule?.focuses).filter(
    (entry): entry is FocusPreference => FOCUS_SET.has(entry as FocusPreference)
  );
  const paces = cleanList(source?.rule?.paces).filter((entry): entry is PacePreference => PACE_SET.has(entry as PacePreference));
  const requiredModuleUnlocks = cleanList(source?.rule?.required_module_unlocks).filter(
    (entry): entry is SuiteModuleId => MODULE_IDS.includes(entry as SuiteModuleId)
  );
  const surfaces = cleanList(source?.surfaces).filter(
    (entry): entry is MediaJourneySurface => SURFACE_SET.has(entry as MediaJourneySurface)
  );

  return {
    id: toMediaId(source?.id, index),
    enabled: Boolean(source?.enabled ?? true),
    title: String(source?.title ?? '').trim(),
    subtitle: String(source?.subtitle ?? '').trim(),
    source_url: String(source?.source_url ?? '').trim(),
    source_kind: SOURCE_KIND_SET.has(sourceKind as MediaSourceKind) ? (sourceKind as MediaSourceKind) : 'single',
    platform: PLATFORM_SET.has(platform as MediaPlatform) ? (platform as MediaPlatform) : 'auto',
    thumbnail_url: String(source?.thumbnail_url ?? '').trim(),
    tags: cleanList(source?.tags),
    priority: Number.isFinite(Number(source?.priority)) ? Math.max(1, Math.min(999, Math.round(Number(source.priority)))) : 100,
    surfaces: surfaces.length ? surfaces : ['episodes'],
    rule: {
      audience: AUDIENCE_SET.has(audience as MediaAudience) ? (audience as MediaAudience) : 'all',
      intents,
      focuses,
      paces,
      required_module_unlocks: requiredModuleUnlocks,
    },
  };
};

const authHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const adminRequest = async (path: string, init: RequestInit, label: string): Promise<Response> => {
  const origin = resolveApiOrigin();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const resp = await fetch(`${origin}${path}`, init);
      if (resp.ok) return resp;

      const txt = await resp.text().catch(() => '');
      const error = new Error(`${label} (${resp.status}): ${txt || resp.statusText}`);
      if (![502, 503, 504].includes(resp.status) || attempt === 2) {
        throw error;
      }
      lastError = error;
    } catch (error: any) {
      const message = String(error?.message ?? '');
      const isTransientNetworkFailure =
        error instanceof TypeError ||
        message.includes('Failed to fetch') ||
        message.includes('Load failed') ||
        message.includes('NetworkError');
      if (!isTransientNetworkFailure || attempt === 2) {
        throw error instanceof Error ? error : new Error(`${label}: ${message || 'request_failed'}`);
      }
      lastError = error instanceof Error ? error : new Error(`${label}: ${message || 'request_failed'}`);
    }

    await sleep(350 * (attempt + 1));
  }

  throw lastError ?? new Error(`${label}: request_failed`);
};

const normalizeAdminConfig = (input: any): AppConfig => {
  const source = input && typeof input === 'object' ? input : {};
  const defaultGeminiLiveModel = GEMINI_LIVE_MODEL_OPTIONS[0]?.id || 'gemini-2.5-flash-native-audio-preview-12-2025';
  return {
    generation: {
      suite_model: String(source?.generation?.suite_model ?? 'gemini-3-flash-preview'),
      binge_model: String(source?.generation?.binge_model ?? 'gemini-3-flash-preview'),
      suite_temperature: Number(source?.generation?.suite_temperature ?? 0.45),
      binge_temperature: Number(source?.generation?.binge_temperature ?? 0.7),
    },
    prompts: {
      suite_appendix: String(source?.prompts?.suite_appendix ?? ''),
      binge_appendix: String(source?.prompts?.binge_appendix ?? ''),
      rom_appendix: String(source?.prompts?.rom_appendix ?? ''),
      live_appendix: String(source?.prompts?.live_appendix ?? ''),
      art_director_appendix: String(source?.prompts?.art_director_appendix ?? ''),
    },
    ui: {
      show_prologue: Boolean(source?.ui?.show_prologue ?? true),
      episodes_enabled: Boolean(source?.ui?.episodes_enabled ?? true),
    },
    brand: normalizeBrandConfig(source?.brand),
    operations: {
      cjs_enabled: Boolean(source?.operations?.cjs_enabled ?? true),
      onboarding_email_enabled: Boolean(source?.operations?.onboarding_email_enabled ?? false),
      curriculum_code: String(source?.operations?.curriculum_code ?? 'SSAI-AI-100-D12026'),
      intro_course_offer: String(source?.operations?.intro_course_offer ?? '$149 Intro to AI Course'),
    },
    media: {
      enabled: Boolean(source?.media?.enabled ?? true),
      image_model: String(source?.media?.image_model ?? 'gemini-2.5-flash-image-preview'),
      video_model: String(source?.media?.video_model ?? 'veo-3.1-generate-preview'),
      image_style: String(source?.media?.image_style ?? ''),
      video_style: String(source?.media?.video_style ?? ''),
      narrative_lens: String(source?.media?.narrative_lens ?? ''),
      image_aspect_ratio: String(source?.media?.image_aspect_ratio ?? '16:9'),
      video_aspect_ratio: String(source?.media?.video_aspect_ratio ?? '16:9'),
      video_duration_seconds: Number(source?.media?.video_duration_seconds ?? 8),
      video_generate_audio: Boolean(source?.media?.video_generate_audio ?? false),
      auto_generate_on_episode: Boolean(source?.media?.auto_generate_on_episode ?? false),
      external_media_enabled: Boolean(source?.media?.external_media_enabled ?? true),
      curated_library: Array.isArray(source?.media?.curated_library)
        ? source.media.curated_library.map((entry: unknown, index: number) =>
            normalizeCuratedMediaItem(entry, index)
          )
        : [],
    },
    voice: {
      enabled: Boolean(source?.voice?.enabled ?? false),
      sesame_enabled: Boolean(source?.voice?.sesame_enabled ?? false),
      provider:
        source?.voice?.provider === 'sesame' && Boolean(source?.voice?.sesame_enabled)
          ? 'sesame'
          : 'gemini_live',
      api_url: String(source?.voice?.api_url ?? ''),
      speaker: String(source?.voice?.speaker ?? 'Concierge'),
      gemini_live_model: String(source?.voice?.gemini_live_model ?? defaultGeminiLiveModel),
      gemini_voice_name: String(source?.voice?.gemini_voice_name ?? 'Aoede'),
      max_audio_length_ms: Number(source?.voice?.max_audio_length_ms ?? 12000),
      temperature: Number(source?.voice?.temperature ?? 0.9),
      narration_style: String(source?.voice?.narration_style ?? 'Calm concierge narration with subtle human hesitations.'),
      gemini_input_audio_transcription_enabled: Boolean(
        source?.voice?.gemini_input_audio_transcription_enabled ?? true
      ),
      gemini_output_audio_transcription_enabled: Boolean(
        source?.voice?.gemini_output_audio_transcription_enabled ?? true
      ),
      gemini_affective_dialog_enabled: Boolean(source?.voice?.gemini_affective_dialog_enabled ?? false),
      gemini_proactive_audio_enabled: Boolean(source?.voice?.gemini_proactive_audio_enabled ?? false),
      gemini_activity_handling: source?.voice?.gemini_activity_handling === 'wait' ? 'wait' : 'interrupt',
      gemini_thinking_enabled: Boolean(source?.voice?.gemini_thinking_enabled ?? false),
      gemini_thinking_budget: Math.max(0, Math.min(1024, Number(source?.voice?.gemini_thinking_budget ?? 0) || 0)),
      live_vad_silence_ms: Number(source?.voice?.live_vad_silence_ms ?? 380),
      live_vad_prefix_padding_ms: Number(source?.voice?.live_vad_prefix_padding_ms ?? 120),
      live_vad_start_sensitivity: source?.voice?.live_vad_start_sensitivity === 'low' ? 'low' : 'high',
      live_vad_end_sensitivity: source?.voice?.live_vad_end_sensitivity === 'low' ? 'low' : 'high',
    },
    safety: {
      tone_guard_enabled: Boolean(source?.safety?.tone_guard_enabled ?? true),
    },
  };
};

export const fetchPublicConfig = async (): Promise<PublicConfig> => {
  const origin = resolveApiOrigin();
  const resp = await fetch(`${origin}/v1/public/config`);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Public config error (${resp.status}): ${txt || resp.statusText}`);
  }
  const data = await resp.json();
  const source = data?.config ?? {};
  return {
    ui: {
      show_prologue: Boolean(source?.ui?.show_prologue ?? true),
      episodes_enabled: Boolean(source?.ui?.episodes_enabled ?? true),
    },
    brand: normalizeBrandConfig(source?.brand),
    operations: {
      cjs_enabled: Boolean(source?.operations?.cjs_enabled ?? true),
    },
  };
};

export const fetchAdminConfig = async (): Promise<AppConfig> => {
  const resp = await adminRequest('/v1/admin/config', {
    method: 'GET',
    headers: await authHeaders(),
  }, 'Admin config error');

  const data = await resp.json();
  return normalizeAdminConfig(data.config);
};

export const fetchAdminSystemOverview = async (): Promise<AdminSystemOverview> => {
  const resp = await adminRequest('/v1/admin/system-overview', {
    method: 'GET',
    headers: await authHeaders(),
  }, 'Admin overview error');

  return (await resp.json()) as AdminSystemOverview;
};

export const fetchAdminMediaPipelineOverview = async (): Promise<AdminMediaPipelineOverview> => {
  const resp = await adminRequest('/v1/admin/media-pipeline', {
    method: 'GET',
    headers: await authHeaders(),
  }, 'Admin media pipeline error');

  return (await resp.json()) as AdminMediaPipelineOverview;
};

export const fetchAdminOrchestrationOverview = async (): Promise<AdminOrchestrationOverview> => {
  const resp = await adminRequest('/v1/admin/orchestration-control-plane', {
    method: 'GET',
    headers: await authHeaders(),
  }, 'Admin orchestration overview error');

  return (await resp.json()) as AdminOrchestrationOverview;
};

export const fetchAdminSamplePersonas = async (): Promise<AdminSamplePersonaOverview> => {
  const resp = await adminRequest('/v1/admin/sample-personas', {
    method: 'GET',
    headers: await authHeaders(),
  }, 'Admin sample personas error');

  return (await resp.json()) as AdminSamplePersonaOverview;
};

export const launchAdminSamplePersona = async (personaId: string): Promise<AdminSamplePersonaLaunch> => {
  const resp = await adminRequest(
    `/v1/admin/sample-personas/${encodeURIComponent(personaId)}/launch`,
    {
      method: 'POST',
      headers: await authHeaders(),
    },
    'Sample persona launch error'
  );

  return (await resp.json()) as AdminSamplePersonaLaunch;
};

export const reseedAdminSamplePersona = async (personaId: string): Promise<void> => {
  await adminRequest(
    `/v1/admin/sample-personas/${encodeURIComponent(personaId)}/reseed`,
    {
      method: 'POST',
      headers: await authHeaders(),
    },
    'Sample persona reseed error'
  );
};

export const markAdminSamplePersonaProof = async (personaId: string, captured: boolean): Promise<void> => {
  await adminRequest(
    `/v1/admin/sample-personas/${encodeURIComponent(personaId)}/proof`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ captured }),
    },
    'Sample persona proof error'
  );
};

export const updateAdminConciergeRequestStatus = async (
  requestId: string,
  status: 'new' | 'reviewed' | 'scheduled'
): Promise<void> => {
  await adminRequest(
    `/v1/admin/concierge-requests/${encodeURIComponent(requestId)}/status`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ status }),
    },
    'Concierge request status error'
  );
};

export const requestAdminMediaRetry = async (clientUid: string, jobId: string): Promise<void> => {
  await adminRequest(
    `/v1/admin/media-pipeline/jobs/${encodeURIComponent(clientUid)}/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
      headers: await authHeaders(),
    },
    'Admin media retry error'
  );
};

export const processAdminMediaJob = async (clientUid: string, jobId: string): Promise<void> => {
  await adminRequest(
    `/v1/admin/media-pipeline/jobs/${encodeURIComponent(clientUid)}/${encodeURIComponent(jobId)}/process`,
    {
      method: 'POST',
      headers: await authHeaders(),
    },
    'Admin media process error'
  );
};

export const processAdminMediaQueue = async (limit = 1): Promise<void> => {
  await adminRequest(
    '/v1/admin/media-pipeline/process-pending',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ limit }),
    },
    'Admin media queue process error'
  );
};

export const reviewAdminMediaManifest = async (
  clientUid: string,
  manifestId: string,
  decision: 'approved' | 'needs_review' | 'rejected'
): Promise<void> => {
  await adminRequest(
    `/v1/admin/media-pipeline/manifests/${encodeURIComponent(clientUid)}/${encodeURIComponent(manifestId)}/review`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ decision }),
    },
    'Admin media review error'
  );
};

export const canAccessAdminConfig = async (): Promise<boolean> => {
  const origin = resolveApiOrigin();
  try {
    const resp = await fetch(`${origin}/v1/admin/config`, {
      method: 'GET',
      headers: await authHeaders(),
    });
    if (resp.status === 401 || resp.status === 403) return false;
    return resp.ok;
  } catch {
    return false;
  }
};

export const reviewAdminOrchestrationRun = async (
  clientUid: string,
  runId: string,
  decision: 'approved' | 'needs_review' | 'request_human_followup'
): Promise<void> => {
  await adminRequest(
    `/v1/admin/orchestration-runs/${encodeURIComponent(clientUid)}/${encodeURIComponent(runId)}/review`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ decision }),
    },
    'Admin orchestration review error'
  );
};

export const saveAdminConfig = async (config: AppConfig): Promise<AppConfig> => {
  const resp = await adminRequest('/v1/admin/config', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ config }),
  }, 'Save config error');

  const data = await resp.json();
  return normalizeAdminConfig(data.config);
};
