import { auth } from './firebase';
import {
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

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-tpcap5aa5a-ew.a.run.app';

const resolveBaseUrl = () => {
  const value = (configuredBaseUrl || defaultBaseUrl).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const getAdminApiOrigin = () => resolveBaseUrl();

const MODULE_IDS: SuiteModuleId[] = [
  ...BRAND_MODULE_IDS,
];
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
  const fallback = DEFAULT_BRAND_CONFIG.modules[moduleId];
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
        String(identity?.company_name ?? DEFAULT_BRAND_CONFIG.identity.company_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.company_name,
      suite_name:
        String(identity?.suite_name ?? DEFAULT_BRAND_CONFIG.identity.suite_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.suite_name,
      product_name:
        String(identity?.product_name ?? DEFAULT_BRAND_CONFIG.identity.product_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.product_name,
      logo_url: String(identity?.logo_url ?? DEFAULT_BRAND_CONFIG.identity.logo_url).trim(),
      logo_alt:
        String(identity?.logo_alt ?? DEFAULT_BRAND_CONFIG.identity.logo_alt).trim() ||
        DEFAULT_BRAND_CONFIG.identity.logo_alt,
      header_context:
        String(identity?.header_context ?? DEFAULT_BRAND_CONFIG.identity.header_context).trim() ||
        DEFAULT_BRAND_CONFIG.identity.header_context,
    },
    colors: {
      accent: normalizeHexColor(colors?.accent, DEFAULT_BRAND_CONFIG.colors.accent),
      accent_dark: normalizeHexColor(colors?.accent_dark, DEFAULT_BRAND_CONFIG.colors.accent_dark),
      ink: normalizeHexColor(colors?.ink, DEFAULT_BRAND_CONFIG.colors.ink),
      page_background: normalizeHexColor(colors?.page_background, DEFAULT_BRAND_CONFIG.colors.page_background),
      surface_background: normalizeHexColor(
        colors?.surface_background,
        DEFAULT_BRAND_CONFIG.colors.surface_background
      ),
      grid_line: normalizeHexColor(colors?.grid_line, DEFAULT_BRAND_CONFIG.colors.grid_line),
      overlay_background: normalizeHexColor(
        colors?.overlay_background,
        DEFAULT_BRAND_CONFIG.colors.overlay_background
      ),
      overlay_text: normalizeHexColor(colors?.overlay_text, DEFAULT_BRAND_CONFIG.colors.overlay_text),
    },
    hierarchy: {
      header_scale: BRAND_HEADER_SCALE_SET.has(hierarchy?.header_scale as BrandHeaderScale)
        ? (hierarchy.header_scale as BrandHeaderScale)
        : DEFAULT_BRAND_CONFIG.hierarchy.header_scale,
      subheader_scale: BRAND_SUBHEADER_SCALE_SET.has(hierarchy?.subheader_scale as BrandSubheaderScale)
        ? (hierarchy.subheader_scale as BrandSubheaderScale)
        : DEFAULT_BRAND_CONFIG.hierarchy.subheader_scale,
      body_density: BRAND_BODY_DENSITY_SET.has(hierarchy?.body_density as BrandBodyDensity)
        ? (hierarchy.body_density as BrandBodyDensity)
        : DEFAULT_BRAND_CONFIG.hierarchy.body_density,
      tile_emphasis: BRAND_TILE_EMPHASIS_SET.has(hierarchy?.tile_emphasis as BrandTileEmphasis)
        ? (hierarchy.tile_emphasis as BrandTileEmphasis)
        : DEFAULT_BRAND_CONFIG.hierarchy.tile_emphasis,
      overlay_style: BRAND_OVERLAY_STYLE_SET.has(hierarchy?.overlay_style as BrandOverlayStyle)
        ? (hierarchy.overlay_style as BrandOverlayStyle)
        : DEFAULT_BRAND_CONFIG.hierarchy.overlay_style,
    },
    toggles: {
      show_logo_mark:
        typeof toggles?.show_logo_mark === 'boolean'
          ? toggles.show_logo_mark
          : DEFAULT_BRAND_CONFIG.toggles.show_logo_mark,
      show_suite_kicker:
        typeof toggles?.show_suite_kicker === 'boolean'
          ? toggles.show_suite_kicker
          : DEFAULT_BRAND_CONFIG.toggles.show_suite_kicker,
      show_module_indices:
        typeof toggles?.show_module_indices === 'boolean'
          ? toggles.show_module_indices
          : DEFAULT_BRAND_CONFIG.toggles.show_module_indices,
      show_module_status:
        typeof toggles?.show_module_status === 'boolean'
          ? toggles.show_module_status
          : DEFAULT_BRAND_CONFIG.toggles.show_module_status,
      show_tile_descriptions:
        typeof toggles?.show_tile_descriptions === 'boolean'
          ? toggles.show_tile_descriptions
          : DEFAULT_BRAND_CONFIG.toggles.show_tile_descriptions,
      show_detail_quotes:
        typeof toggles?.show_detail_quotes === 'boolean'
          ? toggles.show_detail_quotes
          : DEFAULT_BRAND_CONFIG.toggles.show_detail_quotes,
      show_grid_glow:
        typeof toggles?.show_grid_glow === 'boolean'
          ? toggles.show_grid_glow
          : DEFAULT_BRAND_CONFIG.toggles.show_grid_glow,
      show_home_callout:
        typeof toggles?.show_home_callout === 'boolean'
          ? toggles.show_home_callout
          : DEFAULT_BRAND_CONFIG.toggles.show_home_callout,
    },
    copy: {
      prologue_quote:
        String(copy?.prologue_quote ?? DEFAULT_BRAND_CONFIG.copy.prologue_quote).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_quote,
      prologue_description:
        String(copy?.prologue_description ?? DEFAULT_BRAND_CONFIG.copy.prologue_description).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_description,
      prologue_enter_label:
        String(copy?.prologue_enter_label ?? DEFAULT_BRAND_CONFIG.copy.prologue_enter_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_enter_label,
      home_kicker:
        String(copy?.home_kicker ?? DEFAULT_BRAND_CONFIG.copy.home_kicker).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_kicker,
      home_title:
        String(copy?.home_title ?? DEFAULT_BRAND_CONFIG.copy.home_title).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_title,
      home_description:
        String(copy?.home_description ?? DEFAULT_BRAND_CONFIG.copy.home_description).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_description,
      home_callout_label:
        String(copy?.home_callout_label ?? DEFAULT_BRAND_CONFIG.copy.home_callout_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_callout_label,
      home_callout_value:
        String(copy?.home_callout_value ?? DEFAULT_BRAND_CONFIG.copy.home_callout_value).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_callout_value,
      free_tier_notice:
        String(copy?.free_tier_notice ?? DEFAULT_BRAND_CONFIG.copy.free_tier_notice).trim() ||
        DEFAULT_BRAND_CONFIG.copy.free_tier_notice,
      module_ready_label:
        String(copy?.module_ready_label ?? DEFAULT_BRAND_CONFIG.copy.module_ready_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.module_ready_label,
      module_locked_label:
        String(copy?.module_locked_label ?? DEFAULT_BRAND_CONFIG.copy.module_locked_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.module_locked_label,
      mobile_focus_hint:
        String(copy?.mobile_focus_hint ?? DEFAULT_BRAND_CONFIG.copy.mobile_focus_hint).trim() ||
        DEFAULT_BRAND_CONFIG.copy.mobile_focus_hint,
      modal_meta_label:
        String(copy?.modal_meta_label ?? DEFAULT_BRAND_CONFIG.copy.modal_meta_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.modal_meta_label,
      modal_account_label:
        String(copy?.modal_account_label ?? DEFAULT_BRAND_CONFIG.copy.modal_account_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.modal_account_label,
    },
    modules: normalizedModules,
  };
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

const normalizeAdminConfig = (input: any): AppConfig => {
  const source = input && typeof input === 'object' ? input : {};
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
      provider: source?.voice?.provider === 'gemini_live' ? 'gemini_live' : 'sesame',
      api_url: String(source?.voice?.api_url ?? ''),
      speaker: String(source?.voice?.speaker ?? 'Maya'),
      gemini_live_model: String(source?.voice?.gemini_live_model ?? 'gemini-2.5-flash-native-audio-preview-12-2025'),
      gemini_voice_name: String(source?.voice?.gemini_voice_name ?? 'Aoede'),
      max_audio_length_ms: Number(source?.voice?.max_audio_length_ms ?? 12000),
      temperature: Number(source?.voice?.temperature ?? 0.9),
      narration_style: String(source?.voice?.narration_style ?? 'Calm concierge narration with subtle human hesitations.'),
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
  const origin = resolveBaseUrl();
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
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/config`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Admin config error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return normalizeAdminConfig(data.config);
};

export const fetchAdminSystemOverview = async (): Promise<AdminSystemOverview> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/system-overview`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Admin overview error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as AdminSystemOverview;
};

export const canAccessAdminConfig = async (): Promise<boolean> => {
  const origin = resolveBaseUrl();
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

export const saveAdminConfig = async (config: AppConfig): Promise<AppConfig> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/config`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ config }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Save config error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return normalizeAdminConfig(data.config);
};
