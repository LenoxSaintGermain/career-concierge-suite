import { auth } from './firebase';
import { AppConfig, PublicConfig } from '../types';

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-pplaphmpxq-uw.a.run.app';

const resolveBaseUrl = () => {
  const value = (configuredBaseUrl || defaultBaseUrl).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
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
