import { auth } from './firebase';
import {
  AppConfig,
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

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-pplaphmpxq-uw.a.run.app';

const resolveBaseUrl = () => {
  const value = (configuredBaseUrl || defaultBaseUrl).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const MODULE_IDS: SuiteModuleId[] = [
  'intake',
  'episodes',
  'brief',
  'suite_distilled',
  'profile',
  'ai_profile',
  'gaps',
  'readiness',
  'cjs_execution',
  'plan',
  'assets',
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

const cleanList = (input: unknown): string[] =>
  Array.isArray(input)
    ? input.map((entry) => String(entry ?? '').trim()).filter(Boolean)
    : [];

const toMediaId = (value: unknown, index: number) => {
  const raw = String(value ?? '').trim();
  if (raw) return raw;
  return `media-${index + 1}`;
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
