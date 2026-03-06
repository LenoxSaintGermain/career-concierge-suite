import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { EndSensitivity, GoogleGenAI, Modality, StartSensitivity } from '@google/genai';
import {
  CONCIERGE_ROM_SYSTEM,
  EPISODE_SCHEMA,
  ROM_VERSION,
  SUITE_ARTIFACTS_SCHEMA,
  composeBingePrompt,
  composeBingeSystemInstruction,
  composeSuitePrompt,
  findToneViolations,
} from './prompts/conciergeRom.js';
import {
  BRAND_BODY_DENSITIES,
  BRAND_HEADER_SCALES,
  BRAND_MODULE_IDS,
  BRAND_OVERLAY_STYLES,
  BRAND_SUBHEADER_SCALES,
  BRAND_TILE_EMPHASES,
  DEFAULT_BRAND_CONFIG,
} from './config/brandSystem.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: true }));

// Firebase Admin uses Application Default Credentials in Cloud Run.
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'career-concierge';
const db = getFirestore(admin.app(), firestoreDatabaseId);
const storageBucketName =
  process.env.CCS_STORAGE_BUCKET ||
  process.env.STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  (process.env.GOOGLE_CLOUD_PROJECT ? `${process.env.GOOGLE_CLOUD_PROJECT}.appspot.com` : '');

const requireAuth = async (req, res, next) => {
  const authHeader = req.header('authorization') ?? '';
  const m = authHeader.match(/^Bearer (.+)$/i);
  if (!m) return res.status(401).json({ error: 'missing_bearer_token' });
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.user = { uid: decoded.uid, email: decoded.email ?? null, claims: decoded };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'admin_required' });
  }
  next();
};

// NOTE: GFE can intercept /healthz; keep external health on /health.
app.get('/health', (_req, res) => res.status(200).send('OK'));

app.get('/v1/public/config', async (_req, res) => {
  const config = await loadAppConfig();
  return res.json({
    config: {
      ui: config.ui,
      brand: config.brand,
      operations: {
        cjs_enabled: config.operations.cjs_enabled,
      },
    },
  });
});

app.get('/v1/admin/config', requireAuth, requireAdmin, async (_req, res) => {
  const config = await loadAppConfig();
  return res.json({ config });
});

app.get('/v1/admin/system-overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const limit = 8;
    const clientsSnap = await db
      .collection('clients')
      .select('display_name', 'email', 'account', 'demo_profile')
      .get();
    const pendingRows = [];
    const queueClientIds = new Set();
    let hydratedAccountCount = 0;

    for (const clientSnap of clientsSnap.docs) {
      const clientData = clientSnap.data() ?? {};
      if (clientData?.account?.hydrated === true || clientData?.demo_profile?.hydrated === true) {
        hydratedAccountCount += 1;
      }
      const interactionsSnap = await clientInteractionsRef(clientSnap.id)
        .where('status', '==', 'pending_approval')
        .limit(limit)
        .get();
      if (!interactionsSnap.empty) queueClientIds.add(clientSnap.id);
      interactionsSnap.docs.forEach((interactionSnap) => {
        pendingRows.push(serializeInteraction(interactionSnap));
      });
    }

    pendingRows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const config = await loadAppConfig();
    const writeScopeCount = AGENT_REGISTRY.reduce((total, agent) => total + agent.writes.length, 0);

    return res.json({
      runtime: {
        project_id: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'local',
        region:
          process.env.CLOUD_RUN_REGION ||
          process.env.GOOGLE_CLOUD_REGION ||
          process.env.REGION ||
          'unknown',
        service_name: process.env.K_SERVICE || 'career-concierge-api',
        revision: process.env.K_REVISION || 'local-dev',
        firestore_database_id: firestoreDatabaseId,
        storage_bucket: storageBucketName || '',
        gemini_configured: Boolean(geminiApiKey),
        sesame_configured: Boolean(sesameApiKey),
        admin_email_mode: adminEmailSet.size > 0 ? 'allowlist' : 'open',
        admin_email_count: adminEmailSet.size,
        rom_version: ROM_VERSION,
      },
      queue: {
        pending_count: pendingRows.length,
        client_count: queueClientIds.size,
        hydrated_account_count: hydratedAccountCount,
        items: pendingRows.slice(0, limit),
      },
      agents: {
        count: AGENT_REGISTRY.length,
        approval_required_count: AGENT_REGISTRY.filter((agent) => agent.approval_required).length,
        write_scope_count: writeScopeCount,
        items: AGENT_REGISTRY,
      },
      config_summary: {
        external_media_enabled: Boolean(config.media?.external_media_enabled),
        curated_library_count: Array.isArray(config.media?.curated_library) ? config.media.curated_library.length : 0,
        curated_library_enabled_count: Array.isArray(config.media?.curated_library)
          ? config.media.curated_library.filter((item) => item?.enabled !== false).length
          : 0,
        voice_enabled: Boolean(config.voice?.enabled),
        voice_provider: nonEmpty(config.voice?.provider) || 'sesame',
        live_model: nonEmpty(config.voice?.gemini_live_model) || geminiLiveModelDefault,
        suite_model: nonEmpty(config.generation?.suite_model) || fastTextModel,
        binge_model: nonEmpty(config.generation?.binge_model) || fastTextModel,
        image_model: nonEmpty(config.media?.image_model) || imageModelDefault,
        video_model: nonEmpty(config.media?.video_model) || videoModelDefault,
        episodes_enabled: Boolean(config.ui?.episodes_enabled),
        cjs_enabled: Boolean(config.operations?.cjs_enabled),
        tone_guard_enabled: Boolean(config.safety?.tone_guard_enabled),
        onboarding_email_enabled: Boolean(config.operations?.onboarding_email_enabled),
        auto_generate_on_episode: Boolean(config.media?.auto_generate_on_episode),
        suite_overlay_configured: Boolean(nonEmpty(config.prompts?.suite_appendix)),
        binge_overlay_configured: Boolean(nonEmpty(config.prompts?.binge_appendix)),
        rom_overlay_configured: Boolean(nonEmpty(config.prompts?.rom_appendix)),
        live_overlay_configured: Boolean(nonEmpty(config.prompts?.live_appendix)),
        art_director_overlay_configured: Boolean(nonEmpty(config.prompts?.art_director_appendix)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_system_overview_failed',
      detail: sanitizeError(error, 'admin_system_overview_failed'),
    });
  }
});

app.put('/v1/admin/config', requireAuth, requireAdmin, async (req, res) => {
  const next = normalizeConfig(req.body?.config ?? {});
  await configRef().set(
    {
      config: next,
      updated_by: req.user.email ?? req.user.uid,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
  return res.json({ ok: true, config: next });
});

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || null;
const sesameApiKey = process.env.SESAME_API_KEY || null;
const sesameAuthHeader = process.env.SESAME_AUTH_HEADER || 'Authorization';
const sesameAuthPrefix = process.env.SESAME_AUTH_PREFIX || 'Bearer ';
const fastTextModel = process.env.GEMINI_MODEL_FAST || 'gemini-3-flash-preview';
const imageModelDefault = process.env.GEMINI_MODEL_IMAGE || 'gemini-2.5-flash-image-preview';
const videoModelDefault = process.env.GEMINI_MODEL_VIDEO || 'veo-3.1-generate-preview';
const geminiLiveModelDefault =
  process.env.GEMINI_MODEL_LIVE_VOICE || 'gemini-2.5-flash-native-audio-preview-12-2025';
const geminiLiveVadSilenceMsDefault = Number(process.env.GEMINI_LIVE_VAD_SILENCE_MS || 380);
const geminiLiveVadPrefixMsDefault = Number(process.env.GEMINI_LIVE_VAD_PREFIX_MS || 120);
const geminiLiveVadStartDefault = String(process.env.GEMINI_LIVE_VAD_START || 'high').toLowerCase();
const geminiLiveVadEndDefault = String(process.env.GEMINI_LIVE_VAD_END || 'high').toLowerCase();
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const liveTokenAi = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { apiVersion: 'v1alpha' } })
  : null;

const nonEmpty = (value) => String(value ?? '').trim();
const toDisplayName = (user) => {
  const fromClaims = nonEmpty(user?.claims?.name);
  const fromEmail = nonEmpty(user?.email).split('@')[0] || '';
  const raw = fromClaims || fromEmail;
  const cleaned = raw
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};
const defaultAdminEmails = ['operator@thirdsignal.ai', 'gws@conciergecareerservices.com'];

const adminEmailSet = new Set(
  [...defaultAdminEmails, ...(process.env.ADMIN_EMAILS || '').split(',')]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const CONFIG_COLLECTION = 'system';
const CONFIG_DOC = 'career-concierge-config';
const DEFAULT_APP_CONFIG = {
  generation: {
    suite_model: fastTextModel,
    binge_model: fastTextModel,
    suite_temperature: 0.45,
    binge_temperature: 0.7,
  },
  prompts: {
    suite_appendix: '',
    binge_appendix: '',
    rom_appendix: '',
    live_appendix: '',
    art_director_appendix: '',
  },
  ui: {
    show_prologue: true,
    episodes_enabled: true,
  },
  brand: JSON.parse(JSON.stringify(DEFAULT_BRAND_CONFIG)),
  operations: {
    cjs_enabled: true,
    onboarding_email_enabled: false,
    curriculum_code: 'SSAI-AI-100-D12026',
    intro_course_offer: '$149 Intro to AI Course',
  },
  media: {
    enabled: true,
    image_model: imageModelDefault,
    video_model: videoModelDefault,
    image_style:
      'Editorial still, restrained palette, cinematic composition, soft directional light, human texture, premium career narrative.',
    video_style:
      'Cinematic micro-drama, deliberate camera movement, subtle teal accent, emotionally contained performances, premium corporate realism.',
    narrative_lens: 'Pressure to clarity under executive stakes.',
    image_aspect_ratio: '16:9',
    video_aspect_ratio: '16:9',
    video_duration_seconds: 8,
    video_generate_audio: false,
    auto_generate_on_episode: false,
    external_media_enabled: true,
    curated_library: [],
  },
  voice: {
    enabled: false,
    provider: 'sesame',
    api_url: process.env.SESAME_API_URL || '',
    speaker: process.env.SESAME_SPEAKER || 'Maya',
    gemini_live_model: geminiLiveModelDefault,
    gemini_voice_name: process.env.GEMINI_VOICE_NAME || 'Aoede',
    max_audio_length_ms: 12_000,
    temperature: 0.9,
    narration_style: 'Calm concierge narration with subtle human hesitations and restrained authority.',
    live_vad_silence_ms: Number.isFinite(geminiLiveVadSilenceMsDefault) ? geminiLiveVadSilenceMsDefault : 380,
    live_vad_prefix_padding_ms: Number.isFinite(geminiLiveVadPrefixMsDefault) ? geminiLiveVadPrefixMsDefault : 120,
    live_vad_start_sensitivity: geminiLiveVadStartDefault === 'low' ? 'low' : 'high',
    live_vad_end_sensitivity: geminiLiveVadEndDefault === 'low' ? 'low' : 'high',
  },
  safety: {
    tone_guard_enabled: true,
  },
};

const clamp01 = (value, fallback) => {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
};

const clampInteger = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const rounded = Math.round(number);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
};

const normalizeSensitivity = (value, fallback) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'low') return normalized;
  return fallback;
};

const MODULE_IDS = new Set(BRAND_MODULE_IDS);
const JOURNEY_SURFACES = new Set(['suite_home', 'pre_intake', 'post_intake', ...MODULE_IDS]);
const MEDIA_SOURCE_KINDS = new Set(['single', 'playlist']);
const MEDIA_PLATFORMS = new Set([
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
const MEDIA_AUDIENCES = new Set(['all', 'new_clients', 'active_clients', 'admins', 'non_admins']);
const CLIENT_INTENT_SET = new Set(['current_role', 'target_role', 'not_sure']);
const FOCUS_PREF_SET = new Set(['job_search', 'skills', 'leadership']);
const PACE_PREF_SET = new Set(['straight', 'standard', 'story']);
const BRAND_HEADER_SCALE_SET = new Set(BRAND_HEADER_SCALES);
const BRAND_SUBHEADER_SCALE_SET = new Set(BRAND_SUBHEADER_SCALES);
const BRAND_BODY_DENSITY_SET = new Set(BRAND_BODY_DENSITIES);
const BRAND_TILE_EMPHASIS_SET = new Set(BRAND_TILE_EMPHASES);
const BRAND_OVERLAY_STYLE_SET = new Set(BRAND_OVERLAY_STYLES);

const toStringList = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean)
    : [];

const normalizeHexColor = (value, fallback) => {
  const raw = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : fallback;
};

const normalizeBrandModuleCopy = (moduleId, value) => {
  const item = value && typeof value === 'object' ? value : {};
  const fallback = DEFAULT_BRAND_CONFIG.modules[moduleId];
  return {
    eyebrow: String(item.eyebrow ?? fallback.eyebrow).trim() || fallback.eyebrow,
    title: String(item.title ?? fallback.title).trim() || fallback.title,
    description: String(item.description ?? fallback.description).trim() || fallback.description,
    detail_title: String(item.detail_title ?? fallback.detail_title).trim() || fallback.detail_title,
    detail_quote: String(item.detail_quote ?? fallback.detail_quote).trim() || fallback.detail_quote,
  };
};

const normalizeBrandConfig = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const identity = source.identity && typeof source.identity === 'object' ? source.identity : {};
  const colors = source.colors && typeof source.colors === 'object' ? source.colors : {};
  const hierarchy = source.hierarchy && typeof source.hierarchy === 'object' ? source.hierarchy : {};
  const toggles = source.toggles && typeof source.toggles === 'object' ? source.toggles : {};
  const copy = source.copy && typeof source.copy === 'object' ? source.copy : {};
  const modules = source.modules && typeof source.modules === 'object' ? source.modules : {};

  const normalizedModules = {};
  BRAND_MODULE_IDS.forEach((moduleId) => {
    normalizedModules[moduleId] = normalizeBrandModuleCopy(moduleId, modules[moduleId]);
  });

  return {
    identity: {
      company_name:
        String(identity.company_name ?? DEFAULT_BRAND_CONFIG.identity.company_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.company_name,
      suite_name:
        String(identity.suite_name ?? DEFAULT_BRAND_CONFIG.identity.suite_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.suite_name,
      product_name:
        String(identity.product_name ?? DEFAULT_BRAND_CONFIG.identity.product_name).trim() ||
        DEFAULT_BRAND_CONFIG.identity.product_name,
      logo_url: String(identity.logo_url ?? DEFAULT_BRAND_CONFIG.identity.logo_url).trim(),
      logo_alt:
        String(identity.logo_alt ?? DEFAULT_BRAND_CONFIG.identity.logo_alt).trim() ||
        DEFAULT_BRAND_CONFIG.identity.logo_alt,
      header_context:
        String(identity.header_context ?? DEFAULT_BRAND_CONFIG.identity.header_context).trim() ||
        DEFAULT_BRAND_CONFIG.identity.header_context,
    },
    colors: {
      accent: normalizeHexColor(colors.accent, DEFAULT_BRAND_CONFIG.colors.accent),
      accent_dark: normalizeHexColor(colors.accent_dark, DEFAULT_BRAND_CONFIG.colors.accent_dark),
      ink: normalizeHexColor(colors.ink, DEFAULT_BRAND_CONFIG.colors.ink),
      page_background: normalizeHexColor(colors.page_background, DEFAULT_BRAND_CONFIG.colors.page_background),
      surface_background: normalizeHexColor(
        colors.surface_background,
        DEFAULT_BRAND_CONFIG.colors.surface_background
      ),
      grid_line: normalizeHexColor(colors.grid_line, DEFAULT_BRAND_CONFIG.colors.grid_line),
      overlay_background: normalizeHexColor(
        colors.overlay_background,
        DEFAULT_BRAND_CONFIG.colors.overlay_background
      ),
      overlay_text: normalizeHexColor(colors.overlay_text, DEFAULT_BRAND_CONFIG.colors.overlay_text),
    },
    hierarchy: {
      header_scale: BRAND_HEADER_SCALE_SET.has(hierarchy.header_scale)
        ? hierarchy.header_scale
        : DEFAULT_BRAND_CONFIG.hierarchy.header_scale,
      subheader_scale: BRAND_SUBHEADER_SCALE_SET.has(hierarchy.subheader_scale)
        ? hierarchy.subheader_scale
        : DEFAULT_BRAND_CONFIG.hierarchy.subheader_scale,
      body_density: BRAND_BODY_DENSITY_SET.has(hierarchy.body_density)
        ? hierarchy.body_density
        : DEFAULT_BRAND_CONFIG.hierarchy.body_density,
      tile_emphasis: BRAND_TILE_EMPHASIS_SET.has(hierarchy.tile_emphasis)
        ? hierarchy.tile_emphasis
        : DEFAULT_BRAND_CONFIG.hierarchy.tile_emphasis,
      overlay_style: BRAND_OVERLAY_STYLE_SET.has(hierarchy.overlay_style)
        ? hierarchy.overlay_style
        : DEFAULT_BRAND_CONFIG.hierarchy.overlay_style,
    },
    toggles: {
      show_logo_mark:
        typeof toggles.show_logo_mark === 'boolean'
          ? toggles.show_logo_mark
          : DEFAULT_BRAND_CONFIG.toggles.show_logo_mark,
      show_suite_kicker:
        typeof toggles.show_suite_kicker === 'boolean'
          ? toggles.show_suite_kicker
          : DEFAULT_BRAND_CONFIG.toggles.show_suite_kicker,
      show_module_indices:
        typeof toggles.show_module_indices === 'boolean'
          ? toggles.show_module_indices
          : DEFAULT_BRAND_CONFIG.toggles.show_module_indices,
      show_module_status:
        typeof toggles.show_module_status === 'boolean'
          ? toggles.show_module_status
          : DEFAULT_BRAND_CONFIG.toggles.show_module_status,
      show_tile_descriptions:
        typeof toggles.show_tile_descriptions === 'boolean'
          ? toggles.show_tile_descriptions
          : DEFAULT_BRAND_CONFIG.toggles.show_tile_descriptions,
      show_detail_quotes:
        typeof toggles.show_detail_quotes === 'boolean'
          ? toggles.show_detail_quotes
          : DEFAULT_BRAND_CONFIG.toggles.show_detail_quotes,
      show_grid_glow:
        typeof toggles.show_grid_glow === 'boolean'
          ? toggles.show_grid_glow
          : DEFAULT_BRAND_CONFIG.toggles.show_grid_glow,
      show_home_callout:
        typeof toggles.show_home_callout === 'boolean'
          ? toggles.show_home_callout
          : DEFAULT_BRAND_CONFIG.toggles.show_home_callout,
    },
    copy: {
      prologue_quote:
        String(copy.prologue_quote ?? DEFAULT_BRAND_CONFIG.copy.prologue_quote).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_quote,
      prologue_description:
        String(copy.prologue_description ?? DEFAULT_BRAND_CONFIG.copy.prologue_description).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_description,
      prologue_enter_label:
        String(copy.prologue_enter_label ?? DEFAULT_BRAND_CONFIG.copy.prologue_enter_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.prologue_enter_label,
      home_kicker:
        String(copy.home_kicker ?? DEFAULT_BRAND_CONFIG.copy.home_kicker).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_kicker,
      home_title:
        String(copy.home_title ?? DEFAULT_BRAND_CONFIG.copy.home_title).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_title,
      home_description:
        String(copy.home_description ?? DEFAULT_BRAND_CONFIG.copy.home_description).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_description,
      home_callout_label:
        String(copy.home_callout_label ?? DEFAULT_BRAND_CONFIG.copy.home_callout_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_callout_label,
      home_callout_value:
        String(copy.home_callout_value ?? DEFAULT_BRAND_CONFIG.copy.home_callout_value).trim() ||
        DEFAULT_BRAND_CONFIG.copy.home_callout_value,
      free_tier_notice:
        String(copy.free_tier_notice ?? DEFAULT_BRAND_CONFIG.copy.free_tier_notice).trim() ||
        DEFAULT_BRAND_CONFIG.copy.free_tier_notice,
      module_ready_label:
        String(copy.module_ready_label ?? DEFAULT_BRAND_CONFIG.copy.module_ready_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.module_ready_label,
      module_locked_label:
        String(copy.module_locked_label ?? DEFAULT_BRAND_CONFIG.copy.module_locked_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.module_locked_label,
      mobile_focus_hint:
        String(copy.mobile_focus_hint ?? DEFAULT_BRAND_CONFIG.copy.mobile_focus_hint).trim() ||
        DEFAULT_BRAND_CONFIG.copy.mobile_focus_hint,
      modal_meta_label:
        String(copy.modal_meta_label ?? DEFAULT_BRAND_CONFIG.copy.modal_meta_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.modal_meta_label,
      modal_account_label:
        String(copy.modal_account_label ?? DEFAULT_BRAND_CONFIG.copy.modal_account_label).trim() ||
        DEFAULT_BRAND_CONFIG.copy.modal_account_label,
    },
    modules: normalizedModules,
  };
};

const normalizeCuratedMediaItem = (value, index) => {
  const item = value && typeof value === 'object' ? value : {};
  const id = nonEmpty(item.id) || `media-${index + 1}`;
  const sourceKind = nonEmpty(item.source_kind).toLowerCase();
  const platform = nonEmpty(item.platform).toLowerCase();
  const audience = nonEmpty(item?.rule?.audience).toLowerCase();
  const surfaces = toStringList(item.surfaces).filter((entry) => JOURNEY_SURFACES.has(entry));
  const intents = toStringList(item?.rule?.intents).filter((entry) => CLIENT_INTENT_SET.has(entry));
  const focuses = toStringList(item?.rule?.focuses).filter((entry) => FOCUS_PREF_SET.has(entry));
  const paces = toStringList(item?.rule?.paces).filter((entry) => PACE_PREF_SET.has(entry));
  const requiredUnlocks = toStringList(item?.rule?.required_module_unlocks).filter((entry) =>
    MODULE_IDS.has(entry)
  );
  const priority = clampInteger(item.priority, 100, 1, 999);

  return {
    id,
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    title: String(item.title ?? '').trim(),
    subtitle: String(item.subtitle ?? '').trim(),
    source_url: nonEmpty(item.source_url),
    source_kind: MEDIA_SOURCE_KINDS.has(sourceKind) ? sourceKind : 'single',
    platform: MEDIA_PLATFORMS.has(platform) ? platform : 'auto',
    thumbnail_url: nonEmpty(item.thumbnail_url),
    tags: toStringList(item.tags),
    priority,
    surfaces: surfaces.length ? surfaces : ['episodes'],
    rule: {
      audience: MEDIA_AUDIENCES.has(audience) ? audience : 'all',
      intents,
      focuses,
      paces,
      required_module_unlocks: requiredUnlocks,
    },
  };
};

const normalizeConfig = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const generation = source.generation && typeof source.generation === 'object' ? source.generation : {};
  const prompts = source.prompts && typeof source.prompts === 'object' ? source.prompts : {};
  const ui = source.ui && typeof source.ui === 'object' ? source.ui : {};
  const operations = source.operations && typeof source.operations === 'object' ? source.operations : {};
  const media = source.media && typeof source.media === 'object' ? source.media : {};
  const voice = source.voice && typeof source.voice === 'object' ? source.voice : {};
  const safety = source.safety && typeof source.safety === 'object' ? source.safety : {};
  const brand = source.brand && typeof source.brand === 'object' ? source.brand : {};

  return {
    generation: {
      suite_model: nonEmpty(generation.suite_model) || DEFAULT_APP_CONFIG.generation.suite_model,
      binge_model: nonEmpty(generation.binge_model) || DEFAULT_APP_CONFIG.generation.binge_model,
      suite_temperature: clamp01(generation.suite_temperature, DEFAULT_APP_CONFIG.generation.suite_temperature),
      binge_temperature: clamp01(generation.binge_temperature, DEFAULT_APP_CONFIG.generation.binge_temperature),
    },
    prompts: {
      suite_appendix: String(prompts.suite_appendix ?? '').trim(),
      binge_appendix: String(prompts.binge_appendix ?? '').trim(),
      rom_appendix: String(prompts.rom_appendix ?? '').trim(),
      live_appendix: String(prompts.live_appendix ?? '').trim(),
      art_director_appendix: String(prompts.art_director_appendix ?? '').trim(),
    },
    ui: {
      show_prologue:
        typeof ui.show_prologue === 'boolean' ? ui.show_prologue : DEFAULT_APP_CONFIG.ui.show_prologue,
      episodes_enabled:
        typeof ui.episodes_enabled === 'boolean' ? ui.episodes_enabled : DEFAULT_APP_CONFIG.ui.episodes_enabled,
    },
    brand: normalizeBrandConfig(brand),
    operations: {
      cjs_enabled:
        typeof operations.cjs_enabled === 'boolean'
          ? operations.cjs_enabled
          : DEFAULT_APP_CONFIG.operations.cjs_enabled,
      onboarding_email_enabled:
        typeof operations.onboarding_email_enabled === 'boolean'
          ? operations.onboarding_email_enabled
          : DEFAULT_APP_CONFIG.operations.onboarding_email_enabled,
      curriculum_code: nonEmpty(operations.curriculum_code) || DEFAULT_APP_CONFIG.operations.curriculum_code,
      intro_course_offer:
        nonEmpty(operations.intro_course_offer) || DEFAULT_APP_CONFIG.operations.intro_course_offer,
    },
    media: {
      enabled: typeof media.enabled === 'boolean' ? media.enabled : DEFAULT_APP_CONFIG.media.enabled,
      image_model: nonEmpty(media.image_model) || DEFAULT_APP_CONFIG.media.image_model,
      video_model: nonEmpty(media.video_model) || DEFAULT_APP_CONFIG.media.video_model,
      image_style: String(media.image_style ?? DEFAULT_APP_CONFIG.media.image_style).trim(),
      video_style: String(media.video_style ?? DEFAULT_APP_CONFIG.media.video_style).trim(),
      narrative_lens: String(media.narrative_lens ?? DEFAULT_APP_CONFIG.media.narrative_lens).trim(),
      image_aspect_ratio:
        nonEmpty(media.image_aspect_ratio) || DEFAULT_APP_CONFIG.media.image_aspect_ratio,
      video_aspect_ratio:
        nonEmpty(media.video_aspect_ratio) || DEFAULT_APP_CONFIG.media.video_aspect_ratio,
      video_duration_seconds: clampInteger(
        media.video_duration_seconds,
        DEFAULT_APP_CONFIG.media.video_duration_seconds,
        4,
        12
      ),
      video_generate_audio:
        typeof media.video_generate_audio === 'boolean'
          ? media.video_generate_audio
          : DEFAULT_APP_CONFIG.media.video_generate_audio,
      auto_generate_on_episode:
        typeof media.auto_generate_on_episode === 'boolean'
          ? media.auto_generate_on_episode
          : DEFAULT_APP_CONFIG.media.auto_generate_on_episode,
      external_media_enabled:
        typeof media.external_media_enabled === 'boolean'
          ? media.external_media_enabled
          : DEFAULT_APP_CONFIG.media.external_media_enabled,
      curated_library: Array.isArray(media.curated_library)
        ? media.curated_library.map((entry, index) => normalizeCuratedMediaItem(entry, index))
        : DEFAULT_APP_CONFIG.media.curated_library.map((entry, index) =>
            normalizeCuratedMediaItem(entry, index)
          ),
    },
    voice: {
      enabled: typeof voice.enabled === 'boolean' ? voice.enabled : DEFAULT_APP_CONFIG.voice.enabled,
      provider: voice.provider === 'gemini_live' ? 'gemini_live' : 'sesame',
      api_url: nonEmpty(voice.api_url) || DEFAULT_APP_CONFIG.voice.api_url,
      speaker: nonEmpty(voice.speaker) || DEFAULT_APP_CONFIG.voice.speaker,
      gemini_live_model: nonEmpty(voice.gemini_live_model) || DEFAULT_APP_CONFIG.voice.gemini_live_model,
      gemini_voice_name: nonEmpty(voice.gemini_voice_name) || DEFAULT_APP_CONFIG.voice.gemini_voice_name,
      max_audio_length_ms: clampInteger(
        voice.max_audio_length_ms,
        DEFAULT_APP_CONFIG.voice.max_audio_length_ms,
        3000,
        30000
      ),
      temperature: (() => {
        const number = Number(voice.temperature);
        if (!Number.isFinite(number)) return DEFAULT_APP_CONFIG.voice.temperature;
        if (number < 0.1) return 0.1;
        if (number > 1.5) return 1.5;
        return number;
      })(),
      narration_style: String(voice.narration_style ?? DEFAULT_APP_CONFIG.voice.narration_style).trim(),
      live_vad_silence_ms: clampInteger(
        voice.live_vad_silence_ms,
        DEFAULT_APP_CONFIG.voice.live_vad_silence_ms,
        180,
        2000
      ),
      live_vad_prefix_padding_ms: clampInteger(
        voice.live_vad_prefix_padding_ms,
        DEFAULT_APP_CONFIG.voice.live_vad_prefix_padding_ms,
        0,
        600
      ),
      live_vad_start_sensitivity: normalizeSensitivity(
        voice.live_vad_start_sensitivity,
        DEFAULT_APP_CONFIG.voice.live_vad_start_sensitivity
      ),
      live_vad_end_sensitivity: normalizeSensitivity(
        voice.live_vad_end_sensitivity,
        DEFAULT_APP_CONFIG.voice.live_vad_end_sensitivity
      ),
    },
    safety: {
      tone_guard_enabled:
        typeof safety.tone_guard_enabled === 'boolean'
          ? safety.tone_guard_enabled
          : DEFAULT_APP_CONFIG.safety.tone_guard_enabled,
    },
  };
};

const joinInstructionParts = (...parts) =>
  parts
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join('\n\n');

const suiteSystemInstruction = (runtimeConfig) =>
  joinInstructionParts(CONCIERGE_ROM_SYSTEM, runtimeConfig?.prompts?.rom_appendix);

const bingeSystemInstruction = (runtimeConfig) =>
  joinInstructionParts(composeBingeSystemInstruction(), runtimeConfig?.prompts?.rom_appendix);

const liveSystemInstruction = (runtimeConfig, clientName = '') =>
  joinInstructionParts(
    CONCIERGE_ROM_SYSTEM,
    runtimeConfig?.prompts?.rom_appendix,
    `LIVE OPENING PROTOCOL:
- First response should feel like meeting a trusted concierge, not an assessment.
- If a name is available, use it once naturally: ${clientName || 'client'}.
- Opening should be 1-2 short sentences, then one concise question.
- Focus the question on today's priority and immediate pressure.
- Never use the words: calibrated, calibration, assessment, or test.
- Prefer "understanding your context" and "shaping your suite around you."
- Keep tone composed, premium, and quietly encouraging.`,
    runtimeConfig?.voice?.narration_style || DEFAULT_APP_CONFIG.voice.narration_style,
    runtimeConfig?.prompts?.live_appendix
  );

const configRef = () => db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);

const loadAppConfig = async () => {
  try {
    const snap = await configRef().get();
    if (!snap.exists) return normalizeConfig(DEFAULT_APP_CONFIG);
    const data = snap.data() ?? {};
    const raw = data.config && typeof data.config === 'object' ? data.config : data;
    return normalizeConfig(raw);
  } catch (error) {
    console.error('config_load_error', error);
    return normalizeConfig(DEFAULT_APP_CONFIG);
  }
};

const isAdminUser = (user) => {
  const claims = user?.claims ?? {};
  if (claims.admin === true || claims.staff === true) return true;
  if (adminEmailSet.size === 0) return true;
  const email = String(user?.email ?? '').trim().toLowerCase();
  if (!email) return false;
  return adminEmailSet.has(email);
};

const baseMeta = (mode, degraded, extra = {}) => ({
  prompt_version: ROM_VERSION,
  generation_mode: mode,
  model: extra.model || (mode === 'gemini' ? fastTextModel : 'deterministic-fallback'),
  generated_at: new Date().toISOString(),
  degraded,
  ...extra,
});

const buildSuiteFallback = (answers = {}) => {
  const currentTitle = nonEmpty(answers.current_title || answers.current_or_target_job_title) || 'your current role';
  const industry = nonEmpty(answers.industry) || 'your industry';
  const target = nonEmpty(answers.target || answers.current_or_target_job_title) || 'your next role';
  const constraints = nonEmpty(answers.constraints);
  const pressure = nonEmpty(answers.pressure_breaks);
  const workStyle = nonEmpty(answers.work_style);

  return {
    brief: {
      learned: [
        `You are reallocating from ${currentTitle} toward ${target}.`,
        `Your market context is ${industry}, and clarity will outperform volume.`,
        'Your edge increases when each action has a concrete decision target.',
      ],
      needle: [
        'Convert experience into proof that survives executive scrutiny.',
        'Protect optionality by narrowing effort to high-leverage moves.',
        'Treat AI as a structuring instrument, not a credibility substitute.',
      ],
      next_72_hours: [
        { id: 'n72-1', label: 'Build a verified evidence list: outcomes, scope, and metrics.', done: false },
        { id: 'n72-2', label: 'Define a single target lane and remove adjacent noise.', done: false },
        { id: 'n72-3', label: 'Draft a concise positioning statement for stakeholder-facing use.', done: false },
      ],
    },
    plan: {
      next_72_hours: [
        { id: 'p72-1', label: 'Set non-negotiable constraints: time, location, compensation floor.', done: false },
        { id: 'p72-2', label: 'Prepare one executive brief that explains your value in business terms.', done: false },
        { id: 'p72-3', label: `Run one market test that validates your move toward ${target}.`, done: false },
      ],
      next_2_weeks: {
        goal: 'Increase career optionality through disciplined positioning.',
        cadence: [
          'Two focused outreach actions with explicit asks.',
          'One public credibility artifact tied to your target lane.',
          'One decision review: what changed the math this week.',
        ],
      },
      needs_from_you: [
        'Current resume or equivalent fact set.',
        'Target opportunities ranked by strategic fit.',
      ],
    },
    profile: {
      strengths: [
        'You favor clear thinking over performative busyness.',
        'You respond to structure when stakes are explicit.',
        'You can compound progress through repeatable systems.',
      ],
      patterns: [
        pressure ? `Pressure pattern: ${pressure.toLowerCase()}.` : 'Pressure pattern: decision load rises before clarity.',
        workStyle ? `Stabilizer: ${workStyle.toLowerCase()}.` : 'Stabilizer: short execution cycles with explicit outputs.',
      ],
      leverage: [
        'Turn recurring work into reusable strategic assets.',
        'Translate execution history into board-readable proof.',
        'Use concise language to reduce friction in high-stakes decisions.',
      ],
    },
    ai_profile: {
      positioning: `In ${industry}, your advantage is disciplined signal extraction and controlled execution.`,
      how_to_use_ai: [
        'Condense raw notes into decision-grade briefs.',
        'Pressure-test messaging before stakeholder exposure.',
        'Standardize repeatable outputs with verification steps.',
      ],
      guardrails: [
        'No invented credentials or inflated claims.',
        'Prefer measured specificity over dramatic language.',
        'When uncertain, state assumptions and ask one clarifying question.',
      ],
    },
    gaps: {
      near_term: [
        'Proof points are not yet packaged for executive review.',
        'Positioning lane needs tighter exclusion criteria.',
        'Weekly cadence requires explicit leverage metrics.',
      ],
      for_target_role: [
        `Reframe your experience in the operating language of ${target}.`,
        'Add one visible artifact that demonstrates decision quality.',
      ],
      constraints: constraints ? [`Constraint register: ${constraints}.`] : ['Constraint register is incomplete.'],
    },
  };
};

const deriveEpisodeTargetSkill = ({ dna = {}, explicitSkill = '' }) => {
  const direct = nonEmpty(explicitSkill);
  if (direct) return direct;

  const advanced = toStringList(dna.advanced_interests);
  const foundational = toStringList(dna.foundational_interests);
  const intent = nonEmpty(dna.intent);
  const industry = nonEmpty(dna.industry).toLowerCase();

  if (
    advanced.some((entry) => entry.includes('Ai-Driven Customer Experience Optimization')) ||
    industry.includes('consumer packaged goods')
  ) {
    return 'AI-driven customer segmentation and marketing ROI';
  }
  if (
    advanced.some((entry) => entry.includes('Enterprise Ai Architecture')) ||
    foundational.some((entry) => entry.includes('Ai Strategy & Leadership'))
  ) {
    return 'AI Strategy & Leadership';
  }
  if (foundational.some((entry) => entry.includes('Process Automation / Workflow Optimization'))) {
    return 'Process Automation / Workflow Optimization';
  }
  if (intent === 'target_role') return 'Internal promotion strategy and ROI storytelling';
  if (intent === 'not_sure') return 'Process Automation / Workflow Optimization';
  return 'AI Strategy & Leadership';
};

const withArtifactMeta = (artifacts, meta) =>
  Object.fromEntries(
    Object.entries(artifacts).map(([key, value]) => [key, { ...value, _meta: meta }])
  );

const safeParseJson = (text) => {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_json_payload');
  }
  return parsed;
};

const loadClientDna = async (uid) => {
  try {
    const snap = await db.collection('clients').doc(uid).get();
    if (!snap.exists) return {};
    const data = snap.data() ?? {};
    const answers = data.intake?.answers ?? {};

    return {
      current_role: nonEmpty(answers.current_title || answers.current_or_target_job_title),
      target_role: nonEmpty(answers.target || answers.current_or_target_job_title),
      industry: nonEmpty(answers.industry),
      constraints: nonEmpty(answers.constraints),
      work_style: nonEmpty(answers.work_style),
      pressure_breaks: nonEmpty(answers.pressure_breaks),
      ai_usage_frequency: nonEmpty(answers.ai_usage_frequency),
      learning_modalities: toStringList(answers.learning_modalities),
      foundational_interests: toStringList(answers.foundational_interests),
      advanced_interests: toStringList(answers.advanced_interests),
      intent: CLIENT_INTENT_SET.has(String(data?.intent ?? '')) ? String(data.intent) : '',
    };
  } catch (error) {
    console.error('dna_load_error', error);
    return {};
  }
};

const loadClientJourneyProfile = async (uid) => {
  try {
    const snap = await db.collection('clients').doc(uid).get();
    if (!snap.exists) {
      return { intake_complete: false, intent: null, focus: null, pace: null };
    }
    const data = snap.data() ?? {};
    return {
      intake_complete: Boolean(data?.intake?.completed_at),
      intent: CLIENT_INTENT_SET.has(String(data?.intent ?? '')) ? String(data.intent) : null,
      focus: FOCUS_PREF_SET.has(String(data?.preferences?.focus ?? '')) ? String(data.preferences.focus) : null,
      pace: PACE_PREF_SET.has(String(data?.preferences?.pace ?? '')) ? String(data.preferences.pace) : null,
    };
  } catch (error) {
    console.error('client_profile_load_error', error);
    return { intake_complete: false, intent: null, focus: null, pace: null };
  }
};

const inferMediaPlatform = (sourceUrl, configuredPlatform = 'auto') => {
  if (configuredPlatform && configuredPlatform !== 'auto') return configuredPlatform;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('vimeo.com')) return 'vimeo';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('loom.com')) return 'loom';
  } catch {}
  const lower = String(sourceUrl ?? '').toLowerCase();
  if (/\.(mp4|webm|ogg)(\?|#|$)/.test(lower)) return 'direct';
  return 'other';
};

const resolveExternalMediaUrls = (item) => {
  const openUrl = nonEmpty(item.source_url);
  const platform = inferMediaPlatform(openUrl, item.platform);
  if (!openUrl) return { platform_resolved: platform, open_url: '', embed_url: '' };

  try {
    const url = new URL(openUrl);
    if (platform === 'youtube') {
      let videoId = '';
      if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.split('/').filter(Boolean)[0] || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2] || '';
      } else {
        videoId = url.searchParams.get('v') || '';
      }
      const playlistId = url.searchParams.get('list') || '';
      if (item.source_kind === 'playlist' && playlistId) {
        return {
          platform_resolved: 'youtube',
          open_url: openUrl,
          embed_url: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`,
        };
      }
      if (videoId) {
        const listPart = playlistId ? `?list=${encodeURIComponent(playlistId)}` : '';
        return {
          platform_resolved: 'youtube',
          open_url: openUrl,
          embed_url: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}${listPart}`,
        };
      }
    }

    if (platform === 'vimeo') {
      const segments = url.pathname.split('/').filter(Boolean);
      const id = segments.reverse().find((segment) => /^\d+$/.test(segment)) || '';
      if (id) {
        return {
          platform_resolved: 'vimeo',
          open_url: openUrl,
          embed_url: `https://player.vimeo.com/video/${encodeURIComponent(id)}`,
        };
      }
    }

    if (platform === 'loom') {
      const segments = url.pathname.split('/').filter(Boolean);
      const key = segments[1] && segments[0] === 'share' ? segments[1] : '';
      if (key) {
        return {
          platform_resolved: 'loom',
          open_url: openUrl,
          embed_url: `https://www.loom.com/embed/${encodeURIComponent(key)}`,
        };
      }
    }

    if (platform === 'tiktok') {
      const segments = url.pathname.split('/').filter(Boolean);
      const id = segments.find((segment) => /^\d+$/.test(segment)) || '';
      if (id) {
        return {
          platform_resolved: 'tiktok',
          open_url: openUrl,
          embed_url: `https://www.tiktok.com/embed/v2/${encodeURIComponent(id)}`,
        };
      }
    }
  } catch {}

  if (platform === 'direct') {
    return { platform_resolved: 'direct', open_url: openUrl, embed_url: openUrl };
  }

  return { platform_resolved: platform, open_url: openUrl, embed_url: '' };
};

const isCuratedMediaMatch = ({ item, surface, context, isAdmin }) => {
  if (!item.enabled) return false;
  if (!nonEmpty(item.source_url)) return false;

  const surfaces = Array.isArray(item.surfaces) ? item.surfaces : [];
  const explicitSurfaces = surfaces.filter((entry) => entry !== 'pre_intake' && entry !== 'post_intake');
  if (explicitSurfaces.length && !explicitSurfaces.includes(surface)) return false;
  const hasPreIntakeSurface = surfaces.includes('pre_intake');
  const hasPostIntakeSurface = surfaces.includes('post_intake');
  if (hasPreIntakeSurface || hasPostIntakeSurface) {
    if (context.intake_complete && !hasPostIntakeSurface) return false;
    if (!context.intake_complete && !hasPreIntakeSurface) return false;
  }

  const audience = String(item?.rule?.audience ?? 'all');
  if (audience === 'admins' && !isAdmin) return false;
  if (audience === 'non_admins' && isAdmin) return false;
  if (audience === 'new_clients' && context.intake_complete) return false;
  if (audience === 'active_clients' && !context.intake_complete) return false;

  const intents = Array.isArray(item?.rule?.intents) ? item.rule.intents : [];
  if (intents.length && context.intent && !intents.includes(context.intent)) return false;
  const focuses = Array.isArray(item?.rule?.focuses) ? item.rule.focuses : [];
  if (focuses.length && context.focus && !focuses.includes(context.focus)) return false;
  const paces = Array.isArray(item?.rule?.paces) ? item.rule.paces : [];
  if (paces.length && context.pace && !paces.includes(context.pace)) return false;

  const requiredUnlocks = Array.isArray(item?.rule?.required_module_unlocks)
    ? item.rule.required_module_unlocks
    : [];
  if (requiredUnlocks.length && !context.intake_complete) {
    const requiresLockedModule = requiredUnlocks.some((moduleId) => moduleId !== 'intake');
    if (requiresLockedModule) return false;
  }

  return true;
};

const defaultArtPrompts = {
  image:
    'A premium editorial still: high-stakes desk scene, minimal interface glow, restrained teal accent, poised subject, quiet urgency.',
  video:
    'An 8-second cinematic cold-open: executive notification, countdown tension, strategic pause, controlled camera push, elegant teal accents.',
  audio:
    'Subtle atmospheric underscore: low pulse, soft ticking motif, restrained tension, premium finish.',
};

const AGENT_REGISTRY = [
  {
    role_id: 'chief_of_staff',
    title: 'Chief of Staff',
    objective: 'Synthesize strategic direction and maintain investor-facing execution continuity.',
    reads: ['clients/{uid}', 'clients/{uid}/artifacts/*', 'clients/{uid}/interactions/*'],
    writes: ['clients/{uid}/interactions/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-05.1',
  },
  {
    role_id: 'resume_reviewer',
    title: 'Resume Reviewer',
    objective: 'Evaluate role alignment and produce specific rewrite priorities.',
    reads: ['clients/{uid}', 'clients/{uid}/assets/*', 'clients/{uid}/artifacts/cjs_execution'],
    writes: ['clients/{uid}/artifacts/resume_review', 'clients/{uid}/interactions/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-05.1',
  },
  {
    role_id: 'search_strategist',
    title: 'Search Strategist',
    objective: 'Build targeted promotion/job-search plans from intake context and role intent.',
    reads: ['clients/{uid}', 'clients/{uid}/assets/*', 'clients/{uid}/artifacts/*'],
    writes: ['clients/{uid}/artifacts/search_strategy', 'clients/{uid}/interactions/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-05.1',
  },
];

const toIso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toSafeFileName = (name) =>
  String(name ?? 'resume')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);

const clientRef = (uid) => db.collection('clients').doc(uid);
const clientAssetsRef = (uid) => clientRef(uid).collection('assets');
const clientArtifactsRef = (uid) => clientRef(uid).collection('artifacts');
const clientInteractionsRef = (uid) => clientRef(uid).collection('interactions');

const parseDataUrl = (input) => {
  const raw = nonEmpty(input);
  if (!raw) return '';
  const m = raw.match(/^data:.*;base64,(.+)$/);
  return m ? m[1] : raw;
};

const readClientProfile = async (uid) => {
  const snap = await clientRef(uid).get();
  return snap.exists ? snap.data() ?? {} : {};
};

const listResumeAssets = async (uid) => {
  const snap = await clientAssetsRef(uid).where('type', '==', 'resume').get();
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() ?? {}) }))
    .sort((a, b) => (toIso(b.updated_at) || '').localeCompare(toIso(a.updated_at) || ''));
};

const writeArtifactDoc = async (uid, type, title, content) => {
  const ref = clientArtifactsRef(uid).doc(type);
  const snap = await ref.get();
  const version = Number(snap.data()?.version || 0) + 1;
  await ref.set(
    {
      type,
      title,
      version,
      content,
      created_at: snap.exists ? snap.data()?.created_at || new Date() : new Date(),
      updated_at: new Date(),
    },
    { merge: true }
  );
  return { type, version };
};

const createInteraction = async ({
  uid,
  type,
  title,
  summary,
  nextActions = [],
  status = 'logged',
  requiresApproval = false,
  source = '',
}) => {
  const profile = await readClientProfile(uid);
  const ref = clientInteractionsRef(uid).doc(`int-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  await ref.set({
    type,
    title,
    summary,
    next_actions: nextActions,
    status,
    requires_approval: requiresApproval,
    source,
    client_uid: uid,
    client_email: nonEmpty(profile?.email),
    client_name: nonEmpty(profile?.display_name || profile?.demo_profile?.name),
    created_at: new Date(),
    updated_at: new Date(),
  });
  const snap = await ref.get();
  return { id: ref.id, ...(snap.data() ?? {}) };
};

const serializeInteraction = (docSnap) => {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    type: String(data.type || 'note'),
    title: String(data.title || 'Interaction'),
    summary: String(data.summary || ''),
    status: String(data.status || 'logged'),
    requires_approval: Boolean(data.requires_approval),
    next_actions: Array.isArray(data.next_actions) ? data.next_actions.map((entry) => String(entry)) : [],
    client_uid: nonEmpty(data.client_uid),
    client_email: nonEmpty(data.client_email),
    client_name: nonEmpty(data.client_name),
    source: nonEmpty(data.source),
    decided_by: nonEmpty(data.decided_by),
    decision_note: nonEmpty(data.decision_note),
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
  };
};

const getAgentDefinition = (roleId) => AGENT_REGISTRY.find((agent) => agent.role_id === roleId) || null;

const assertAgentReadScope = (roleId, requiredScopes) => {
  const agent = getAgentDefinition(roleId);
  if (!agent) throw new Error(`agent_not_registered:${roleId}`);
  const missing = requiredScopes.filter((scope) => !agent.reads.includes(scope));
  if (missing.length) throw new Error(`agent_scope_denied:${roleId}:reads:${missing.join(',')}`);
  return agent;
};

const assertAgentWriteScope = (roleId, requiredScopes) => {
  const agent = getAgentDefinition(roleId);
  if (!agent) throw new Error(`agent_not_registered:${roleId}`);
  const missing = requiredScopes.filter((scope) => !agent.writes.includes(scope));
  if (missing.length) throw new Error(`agent_scope_denied:${roleId}:writes:${missing.join(',')}`);
  return agent;
};

const buildResumeReview = ({ profile, resumeAsset }) => {
  const answers = profile?.intake?.answers || {};
  const targetRole = nonEmpty(resumeAsset?.target_role) || nonEmpty(answers.target) || nonEmpty(answers.current_or_target_job_title) || 'target role';
  const currentRole = nonEmpty(answers.current_title) || nonEmpty(answers.current_or_target_job_title) || 'current role';
  const constraints = nonEmpty(answers.constraints) || 'time and competing priorities';
  const alignmentScore = currentRole.toLowerCase() === targetRole.toLowerCase() ? 76 : 64;

  return {
    summary: `Narrative can be tightened to bridge ${currentRole} to ${targetRole} with stronger ROI framing.`,
    role_alignment_score: alignmentScore,
    strengths: [
      'Role scope and ownership are clearly present.',
      'Cross-functional leadership signal is visible.',
      'Trajectory toward larger scope can be articulated with evidence.',
    ],
    gaps: [
      'Outcome metrics are not consistently quantified.',
      'Executive-language framing is uneven across sections.',
      `Constraint handling (${constraints}) needs explicit mitigation narrative.`,
    ],
    rewrite_focus: [
      'Lead with measurable business outcomes in first three bullets.',
      `Translate daily execution into role-level strategy language for ${targetRole}.`,
      'Add one concise “proof of leverage” section tied to stakeholder impact.',
    ],
  };
};

const buildSearchStrategy = ({ profile, resumeReview }) => {
  const answers = profile?.intake?.answers || {};
  const targetRole = nonEmpty(answers.target) || nonEmpty(answers.current_or_target_job_title) || 'target role';
  const intent = nonEmpty(profile?.intent) || 'current_role';
  const internalTrack = intent === 'target_role';
  const exploratoryTrack = intent === 'not_sure';

  return {
    headline: internalTrack
      ? `Promotion-first strategy for ${targetRole} with KPI-backed positioning.`
      : exploratoryTrack
        ? `Exploration-first strategy for ${targetRole} focused on role fit and confidence-building.`
        : `Readiness strategy for ${targetRole} without active external search pressure.`,
    channels: internalTrack
      ? ['Internal sponsors', 'Manager syncs', 'Cross-functional project visibility']
      : exploratoryTrack
        ? ['Informational interviews', 'Transferable-skills proof', 'Low-risk networking']
        : ['Portfolio artifacts', 'Skill proofs', 'Strategic networking'],
    weekly_actions: internalTrack
      ? [
          'Identify three KPI movements you can tie to an AI-driven proposal.',
          'Run two internal sponsor or stakeholder conversations with explicit asks.',
          'Convert one live initiative into a short promotion-ready proof pack.',
        ]
      : exploratoryTrack
        ? [
            'Research three adjacent roles and the proof each one requires.',
            'Schedule two informational interviews with people already in those lanes.',
            'Rewrite one resume section in transferable-skills language.',
          ]
        : [
            'Ship one internal artifact that demonstrates AI leverage in your current role.',
            'Run two high-signal conversations with explicit asks.',
            'Update positioning narrative using latest evidence from execution.',
          ],
    proof_points: [
      'Recent outcomes mapped to role-level expectations.',
      `Current alignment score baseline: ${resumeReview?.role_alignment_score ?? 0}%.`,
      'One quantified KPI movement narrative per week.',
    ],
  };
};

const buildChiefOfStaffSummary = ({ profile, briefDoc, planDoc, latestEpisode }) => {
  const answers = profile?.intake?.answers || {};
  const role = nonEmpty(answers.current_title) || nonEmpty(answers.current_or_target_job_title) || 'client role';
  const target = nonEmpty(answers.target) || nonEmpty(answers.current_or_target_job_title) || 'next role';
  const firstNeedle = Array.isArray(briefDoc?.needle) ? String(briefDoc.needle[0] || '') : '';
  const firstPlanStep = Array.isArray(planDoc?.next_72_hours) ? String(planDoc.next_72_hours[0]?.label || '') : '';
  const episodeTitle = nonEmpty(latestEpisode?.title);

  return {
    title: 'Chief of Staff Executive Summary',
    summary: `${role} trajectory is pointed toward ${target}. ${firstNeedle || 'Primary strategic need is narrative precision and execution consistency.'}`,
    next_actions: [
      firstPlanStep || 'Execute first 72-hour action and capture evidence.',
      episodeTitle ? `Use episode "${episodeTitle}" as this week’s behavior rehearsal.` : 'Run one focused episode rehearsal and capture lessons.',
      'Return with one measurable output for approval queue review.',
    ],
  };
};

const withEpisodeMediaHints = (episode, runtimeConfig) => {
  const baseEpisode = episode && typeof episode === 'object' ? episode : {};
  const artDirection =
    baseEpisode.art_direction && typeof baseEpisode.art_direction === 'object'
      ? baseEpisode.art_direction
      : {};
  const recommended = Array.isArray(artDirection.recommended_models)
    ? artDirection.recommended_models.filter((entry) => entry && entry.kind && entry.model)
    : [];
  const hasKind = (kind) => recommended.some((entry) => entry.kind === kind);

  if (!hasKind('text')) {
    recommended.unshift({
      kind: 'text',
      model: runtimeConfig.generation.binge_model || fastTextModel,
      note: 'Episode story beats and challenge logic.',
    });
  }
  if (!hasKind('image')) {
    recommended.push({
      kind: 'image',
      model: runtimeConfig.media.image_model,
      note: 'Nano Banana class stills for hooks, swipes, and reward cards.',
    });
  }
  if (!hasKind('video')) {
    recommended.push({
      kind: 'video',
      model: runtimeConfig.media.video_model,
      note: 'Veo 3.1 cinematic clips for tension and cliffhanger continuity.',
    });
  }

  return {
    ...baseEpisode,
    art_direction: {
      ...artDirection,
      image_prompt: nonEmpty(artDirection.image_prompt) || defaultArtPrompts.image,
      video_prompt: nonEmpty(artDirection.video_prompt) || defaultArtPrompts.video,
      audio_prompt: nonEmpty(artDirection.audio_prompt) || defaultArtPrompts.audio,
      recommended_models: recommended,
    },
  };
};

const buildMediaDirection = ({ episode, dna, targetSkill, runtimeConfig }) => {
  const role = nonEmpty(dna?.current_role) || 'client operator';
  const targetRole = nonEmpty(dna?.target_role) || 'next-level operator';
  const industry = nonEmpty(dna?.industry) || 'high-pressure business context';
  const constraints = nonEmpty(dna?.constraints);

  const imageSeed =
    nonEmpty(episode?.art_direction?.image_prompt) ||
    `A decisive professional in ${industry} navigating a critical moment while moving from ${role} to ${targetRole}.`;
  const videoSeed =
    nonEmpty(episode?.art_direction?.video_prompt) ||
    `A tense but elegant micro-drama where ${role} uses AI to act like a ${targetRole} under deadline pressure.`;

  const lens = nonEmpty(runtimeConfig.media.narrative_lens) || DEFAULT_APP_CONFIG.media.narrative_lens;
  const skill = nonEmpty(targetSkill) || 'prompt architecture under pressure';
  const constraintLine = constraints ? `Constraint: ${constraints}.` : 'Constraint: keep the action concise.';
  const artDirectorOverlay = nonEmpty(runtimeConfig.prompts.art_director_appendix);

  return {
    narrative: `${lens} Skill focus: ${skill}.`,
    image_prompt: `${imageSeed}\nStyle direction: ${runtimeConfig.media.image_style}\nNarrative lens: ${lens}\n${constraintLine}${
      artDirectorOverlay ? `\nArt director overlay: ${artDirectorOverlay}` : ''
    }`,
    video_prompt: `${videoSeed}\nStyle direction: ${runtimeConfig.media.video_style}\nNarrative lens: ${lens}\n${constraintLine}${
      artDirectorOverlay ? `\nArt director overlay: ${artDirectorOverlay}` : ''
    }`,
  };
};

const sanitizeError = (error, fallback) => {
  const text = String(error?.message ?? fallback ?? 'generation_failed').trim();
  return text.slice(0, 200);
};

const getNestedString = (obj, path) =>
  path.reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), obj);

const extractSesameAudioPayload = (payload) => {
  const candidates = [
    getNestedString(payload, ['result', 'audio_data']),
    getNestedString(payload, ['result', 'audio']),
    getNestedString(payload, ['audio_data']),
    getNestedString(payload, ['audio']),
    getNestedString(payload, ['data', 'audio_data']),
    getNestedString(payload, ['output', 'audio_data']),
  ];
  const raw = candidates.find((value) => typeof value === 'string' && value.trim());
  if (!raw) return null;

  const cleaned = raw.trim();
  if (cleaned.startsWith('data:audio/')) {
    const [, mimePart = 'audio/wav', base64Part = ''] =
      cleaned.match(/^data:([^;]+);base64,(.+)$/i) || [];
    if (!base64Part) return null;
    return {
      mimeType: mimePart,
      audioBase64: base64Part.replace(/\s+/g, ''),
    };
  }

  const formatCandidates = [
    getNestedString(payload, ['result', 'format']),
    getNestedString(payload, ['format']),
    getNestedString(payload, ['result', 'mime_type']),
    getNestedString(payload, ['mime_type']),
  ];
  const format = String(formatCandidates.find((value) => typeof value === 'string' && value.trim()) || 'wav')
    .toLowerCase()
    .replace('audio/', '');
  const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;

  return {
    mimeType,
    audioBase64: cleaned.replace(/\s+/g, ''),
  };
};

const parsePcmSampleRate = (mimeType) => {
  const match = String(mimeType ?? '').match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
};

const pcm16ToWavBase64 = (pcmBase64, sampleRate = 24000) => {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]).toString('base64');
};

const synthesizeWithSesame = async ({ runtimeConfig, text }) => {
  const endpoint = nonEmpty(runtimeConfig.voice.api_url || process.env.SESAME_API_URL);
  if (!endpoint) {
    throw new Error('missing_voice_api_url');
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.SESAME_TIMEOUT_MS || 45000);
  const timeout = setTimeout(() => controller.abort('sesame_timeout'), timeoutMs);

  try {
    const headers = { 'content-type': 'application/json' };
    if (sesameApiKey) {
      headers[sesameAuthHeader] = `${sesameAuthPrefix}${sesameApiKey}`;
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        speaker: runtimeConfig.voice.speaker,
        max_audio_length_ms: runtimeConfig.voice.max_audio_length_ms,
        temperature: runtimeConfig.voice.temperature,
        narration_style: runtimeConfig.voice.narration_style,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = sanitizeError(await resp.text().catch(() => ''), 'sesame_request_failed');
      const error = new Error(`sesame_request_failed:${resp.status}:${detail}`);
      throw error;
    }

    const payload = await resp.json();
    const audio = extractSesameAudioPayload(payload);
    if (!audio?.audioBase64) {
      throw new Error('invalid_sesame_response');
    }

    return {
      provider: 'sesame',
      mime_type: audio.mimeType,
      audio_base64: audio.audioBase64,
      generated_at: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const synthesizeWithGeminiLive = async ({ runtimeConfig, text, clientName }) => {
  if (!ai) {
    throw new Error('missing_gemini_api_key');
  }

  const timeoutMs = Number(process.env.GEMINI_LIVE_TIMEOUT_MS || 30000);
  const model = nonEmpty(runtimeConfig.voice.gemini_live_model) || geminiLiveModelDefault;
  const voiceName = nonEmpty(runtimeConfig.voice.gemini_voice_name) || nonEmpty(runtimeConfig.voice.speaker) || 'Aoede';
  const instruction = liveSystemInstruction(runtimeConfig, clientName);

  return await new Promise(async (resolve, reject) => {
    let session = null;
    let settled = false;
    let mimeType = 'audio/pcm;rate=24000';
    const chunks = [];
    let timer = null;

    const finish = (resolver) => (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try {
        session?.close();
      } catch {}
      resolver(value);
    };
    const done = finish(resolve);
    const fail = finish(reject);
    timer = setTimeout(() => fail(new Error('gemini_live_timeout')), timeoutMs);

    try {
      session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: runtimeConfig.voice.temperature,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          systemInstruction: instruction,
        },
        callbacks: {
          onmessage: (message) => {
            const parts = message?.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                chunks.push(String(part.inlineData.data).replace(/\s+/g, ''));
              }
              if (part?.inlineData?.mimeType) {
                mimeType = String(part.inlineData.mimeType);
              }
            }

            if (message?.serverContent?.turnComplete) {
              if (!chunks.length) {
                fail(new Error('gemini_live_empty_audio'));
                return;
              }
              const mergedBase64 = chunks.join('');
              const output =
                mimeType.toLowerCase().startsWith('audio/pcm')
                  ? {
                      mime_type: 'audio/wav',
                      audio_base64: pcm16ToWavBase64(mergedBase64, parsePcmSampleRate(mimeType)),
                    }
                  : {
                      mime_type: mimeType,
                      audio_base64: mergedBase64,
                    };

              done({
                provider: 'gemini_live',
                ...output,
                generated_at: new Date().toISOString(),
              });
            }
          },
          onerror: (event) => {
            fail(new Error(`gemini_live_error:${sanitizeError(event, 'gemini_live_error')}`));
          },
          onclose: (event) => {
            if (settled) return;
            if (chunks.length) return;
            fail(new Error(`gemini_live_closed:${sanitizeError(event?.reason, 'closed')}`));
          },
        },
      });

      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

const stubEpisode = (runtimeConfig, seed = 'default', meta = {}) => {
  const now = Date.now().toString(36).slice(-6);
  const raw = {
    episode_id: `ep-${seed}-${now}`,
    title: '4:42 PM Escalation',
    hook_card:
      'It is 4:42 PM on Friday. Your executive sponsor requests a board-ready brief in 18 minutes.\nThe pressure is not technical; it is reputational. You need a controlled response path.',
    lesson_swipes: [
      'Manual drafting exceeds the time budget and increases decision risk.',
      'Unconstrained AI output can introduce unverified claims under pressure.',
      'Use a constrained extraction prompt: facts, unknowns, and output structure.'
    ],
    challenge_terminal: {
      prompt: 'Write the prompt that extracts only verified facts and outputs a one-page executive brief.',
      placeholder: 'Paste your constrained prompt here...'
    },
    reward_asset: 'Unlocked asset: Executive Extraction blueprint.',
    cliffhanger:
      'The brief was accepted and escalated to leadership.\nNow you must defend the logic on Monday.\nSwipe Up.',
    art_direction: {
      image_prompt:
        'A premium, dark concierge dashboard card showing an urgent executive message, teal accent line, minimal editorial typography.',
      video_prompt:
        'A 6-second cinematic cold-open: dark office, phone notification, countdown clock, subtle teal highlight; high-status, restrained.',
      audio_prompt:
        'A subtle tense underscore with soft clock ticks, minimal, premium.',
      recommended_models: [
        { kind: 'text', model: fastTextModel, note: 'Fast episode generation' },
        { kind: 'video', model: runtimeConfig?.media?.video_model || videoModelDefault, note: 'If generating a short cinematic clip' },
        { kind: 'image', model: runtimeConfig?.media?.image_model || imageModelDefault, note: 'If generating card art / thumbnails' }
      ],
    },
    _meta: meta,
  };
  return withEpisodeMediaHints(raw, runtimeConfig || normalizeConfig(DEFAULT_APP_CONFIG));
};

const buildMediaFallbackPack = ({ episodeId, runtimeConfig, direction, reason }) => ({
  episode_id: episodeId,
  narrative: direction.narrative,
  generated_at: new Date().toISOString(),
  degraded: true,
  assets: [
    {
      kind: 'image',
      model: runtimeConfig.media.image_model,
      prompt: direction.image_prompt,
      status: 'unavailable',
      note: `Image generation unavailable: ${reason}`,
    },
    {
      kind: 'video',
      model: runtimeConfig.media.video_model,
      prompt: direction.video_prompt,
      status: 'unavailable',
      note: `Video generation unavailable: ${reason}`,
    },
  ],
});

const generateImageAsset = async ({ runtimeConfig, direction }) => {
  const model = runtimeConfig.media.image_model;
  try {
    const response = await ai.models.generateImages({
      model,
      prompt: direction.image_prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: runtimeConfig.media.image_aspect_ratio,
        outputMimeType: 'image/jpeg',
        outputCompressionQuality: 80,
        enhancePrompt: true,
      },
    });

    const imageBytes = nonEmpty(response?.generatedImages?.[0]?.image?.imageBytes);
    if (!imageBytes) {
      throw new Error('image_bytes_missing');
    }

    return {
      kind: 'image',
      model,
      prompt: direction.image_prompt,
      status: 'generated',
      note: 'Generated from Gemini image API (Nano Banana class model route).',
      image_data_url: `data:image/jpeg;base64,${imageBytes}`,
    };
  } catch (error) {
    return {
      kind: 'image',
      model,
      prompt: direction.image_prompt,
      status: 'unavailable',
      note: `Image generation unavailable: ${sanitizeError(error, 'image_generation_failed')}`,
    };
  }
};

const generateVideoAsset = async ({ runtimeConfig, direction }) => {
  const model = runtimeConfig.media.video_model;
  try {
    const operation = await ai.models.generateVideos({
      model,
      source: {
        prompt: direction.video_prompt,
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: runtimeConfig.media.video_aspect_ratio,
        durationSeconds: runtimeConfig.media.video_duration_seconds,
        generateAudio: runtimeConfig.media.video_generate_audio,
        enhancePrompt: true,
      },
    });

    const videoUri = nonEmpty(operation?.response?.generatedVideos?.[0]?.video?.uri);
    const done = Boolean(operation?.done);

    return {
      kind: 'video',
      model,
      prompt: direction.video_prompt,
      status: done && videoUri ? 'generated' : 'queued',
      note: done
        ? 'Video clip generated.'
        : 'Video render queued. Use refresh to poll operation status.',
      video_operation_name: nonEmpty(operation?.name) || undefined,
      video_done: done,
      video_uri: videoUri || undefined,
    };
  } catch (error) {
    return {
      kind: 'video',
      model,
      prompt: direction.video_prompt,
      status: 'unavailable',
      note: `Video generation unavailable: ${sanitizeError(error, 'video_generation_failed')}`,
    };
  }
};

app.post('/v1/live/token', requireAuth, async (_req, res) => {
  const runtimeConfig = await loadAppConfig();
  if (!runtimeConfig.voice.enabled) {
    return res.status(503).json({ error: 'voice_disabled' });
  }
  if (!liveTokenAi) {
    return res.status(503).json({ error: 'missing_gemini_api_key' });
  }

  const model = nonEmpty(runtimeConfig.voice.gemini_live_model) || geminiLiveModelDefault;
  const voiceName = nonEmpty(runtimeConfig.voice.gemini_voice_name) || nonEmpty(runtimeConfig.voice.speaker) || 'Aoede';
  const clientName = toDisplayName(_req.user);
  const startSensitivity =
    runtimeConfig.voice.live_vad_start_sensitivity === 'low'
      ? StartSensitivity.START_SENSITIVITY_LOW
      : StartSensitivity.START_SENSITIVITY_HIGH;
  const endSensitivity =
    runtimeConfig.voice.live_vad_end_sensitivity === 'low'
      ? EndSensitivity.END_SENSITIVITY_LOW
      : EndSensitivity.END_SENSITIVITY_HIGH;
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 45 * 60 * 1000);
  const newSessionExpireAt = new Date(issuedAt.getTime() + 4 * 60 * 1000);

  try {
    const tokenClient = liveTokenAi.authTokens || liveTokenAi.tokens;
    if (!tokenClient?.create) {
      throw new Error('live_token_client_unavailable');
    }

    const token = await tokenClient.create({
      config: {
        uses: 3,
        expireTime: expiresAt.toISOString(),
        newSessionExpireTime: newSessionExpireAt.toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: liveSystemInstruction(runtimeConfig, clientName),
            temperature: runtimeConfig.voice.temperature,
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: startSensitivity,
                endOfSpeechSensitivity: endSensitivity,
                prefixPaddingMs: runtimeConfig.voice.live_vad_prefix_padding_ms,
                silenceDurationMs: runtimeConfig.voice.live_vad_silence_ms,
              },
            },
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        },
      },
    });

    if (!token?.name) {
      throw new Error('ephemeral_token_missing_name');
    }

    return res.json({
      token_name: token.name,
      model,
      voice_name: voiceName,
      client_name: clientName || undefined,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    return res.status(502).json({
      error: 'live_token_failed',
      detail: sanitizeError(error, 'live_token_failed'),
    });
  }
});

app.post('/v1/voice/synthesize', requireAuth, async (req, res) => {
  const runtimeConfig = await loadAppConfig();
  const clientName = toDisplayName(req.user);
  const text = nonEmpty(req.body?.text);
  if (!text) return res.status(400).json({ error: 'text_required' });
  if (text.length > 1200) return res.status(400).json({ error: 'text_too_long' });
  if (!runtimeConfig.voice.enabled) {
    return res.status(503).json({ error: 'voice_disabled' });
  }

  try {
    const provider = runtimeConfig.voice.provider === 'gemini_live' ? 'gemini_live' : 'sesame';
    const payload =
      provider === 'gemini_live'
        ? await synthesizeWithGeminiLive({ runtimeConfig, text, clientName })
        : await synthesizeWithSesame({ runtimeConfig, text });
    return res.json(payload);
  } catch (error) {
    const reason = sanitizeError(error, 'voice_unavailable');
    if (reason.includes('missing_voice_api_url')) {
      return res.status(503).json({ error: 'missing_voice_api_url', detail: reason });
    }
    if (reason.includes('missing_gemini_api_key')) {
      return res.status(503).json({ error: 'missing_gemini_api_key', detail: reason });
    }
    if (reason.includes('sesame_request_failed')) {
      return res.status(502).json({ error: 'sesame_request_failed', detail: reason });
    }
    if (reason.includes('gemini_live')) {
      return res.status(502).json({ error: 'gemini_live_unavailable', detail: reason });
    }
    return res.status(502).json({ error: 'voice_unavailable', detail: reason });
  }
});

app.post('/v1/suite/generate', requireAuth, async (req, res) => {
  const { intent, preferences, answers } = req.body ?? {};

  if (!intent || !preferences || !answers) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const uid = req.user.uid;
  const runtimeConfig = await loadAppConfig();
  const suiteModel = runtimeConfig.generation.suite_model || fastTextModel;
  const suiteTemperature = runtimeConfig.generation.suite_temperature;
  const suiteAppendix = runtimeConfig.prompts.suite_appendix;
  const toneGuardEnabled = runtimeConfig.safety.tone_guard_enabled;

  if (!ai) {
    const meta = baseMeta('fallback', true, {
      reason: 'missing_gemini_api_key',
      uid,
      intent,
      preferences,
      model: 'deterministic-fallback',
    });
    return res.json({
      meta,
      artifacts: withArtifactMeta(buildSuiteFallback(answers), meta),
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: suiteModel,
      contents: `${composeSuitePrompt({ intent, preferences, answers })}${
        suiteAppendix ? `\n\nAdditional system appendix:\n${suiteAppendix}` : ''
      }`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: SUITE_ARTIFACTS_SCHEMA,
        systemInstruction: suiteSystemInstruction(runtimeConfig),
        temperature: suiteTemperature,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('empty_model_response');
    const artifacts = safeParseJson(text);
    if (toneGuardEnabled) {
      const toneViolations = findToneViolations(artifacts);
      if (toneViolations.length) {
        throw new Error(`tone_violation:${toneViolations.join(',')}`);
      }
    }

    const meta = baseMeta('gemini', false, { uid, intent, preferences, model: suiteModel });
    return res.json({
      meta,
      artifacts: withArtifactMeta(artifacts, meta),
    });
  } catch (error) {
    console.error('suite_generation_error', error);
    const meta = baseMeta('fallback', true, {
      reason: String(error?.message ?? 'suite_generation_failed'),
      uid,
      intent,
      preferences,
    });
    return res.json({
      meta,
      artifacts: withArtifactMeta(buildSuiteFallback(answers), meta),
    });
  }
});

app.get('/v1/media/library', requireAuth, async (req, res) => {
  const runtimeConfig = await loadAppConfig();
  const surfaceCandidate = nonEmpty(req.query?.surface).toLowerCase();
  const surface = JOURNEY_SURFACES.has(surfaceCandidate) ? surfaceCandidate : 'episodes';
  const context = await loadClientJourneyProfile(req.user.uid);
  const isAdmin = isAdminUser(req.user);

  if (!runtimeConfig.media.external_media_enabled) {
    return res.json({
      surface,
      generated_at: new Date().toISOString(),
      context: { ...context, is_admin: isAdmin },
      items: [],
    });
  }

  const curated = Array.isArray(runtimeConfig.media.curated_library)
    ? runtimeConfig.media.curated_library
    : [];
  const visible = curated
    .filter((item) => isCuratedMediaMatch({ item, surface, context, isAdmin }))
    .sort((a, b) => {
      const pa = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 100;
      const pb = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 100;
      if (pa !== pb) return pa - pb;
      return String(a.title ?? '').localeCompare(String(b.title ?? ''));
    })
    .map((item) => ({
      ...item,
      ...resolveExternalMediaUrls(item),
    }));

  return res.json({
    surface,
    generated_at: new Date().toISOString(),
    total_items: curated.length,
    matched_items: visible.length,
    context: {
      intake_complete: context.intake_complete,
      intent: context.intent,
      focus: context.focus,
      pace: context.pace,
      is_admin: isAdmin,
    },
    items: visible,
  });
});

app.get('/v1/agents/registry', requireAuth, async (_req, res) => {
  try {
    await db.collection('system').doc('agent-registry').set(
      {
        agents: AGENT_REGISTRY,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('agent_registry_write_error', error);
  }
  return res.json({
    generated_at: new Date().toISOString(),
    agents: AGENT_REGISTRY,
  });
});

app.get('/v1/cjs/assets', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await clientAssetsRef(uid).get();
    const items = snap.docs
      .map((docSnap) => {
        const data = docSnap.data() ?? {};
        return {
          id: docSnap.id,
          type: String(data.type || 'other'),
          label: String(data.label || data.filename || docSnap.id),
          status: String(data.status || 'active'),
          filename: nonEmpty(data.filename),
          mime_type: nonEmpty(data.mime_type),
          size_bytes: Number(data.size_bytes || 0),
          source_url: nonEmpty(data.source_url),
          storage_path: nonEmpty(data.storage_path),
          storage_provider: nonEmpty(data.storage_provider) || 'none',
          target_role: nonEmpty(data.target_role),
          notes: nonEmpty(data.notes),
          created_at: toIso(data.created_at),
          updated_at: toIso(data.updated_at),
        };
      })
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({
      error: 'assets_list_failed',
      detail: sanitizeError(error, 'assets_list_failed'),
    });
  }
});

app.post('/v1/cjs/resume/upload', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const filename = toSafeFileName(req.body?.filename || 'resume');
  const mimeType = nonEmpty(req.body?.mime_type) || 'application/octet-stream';
  const sourceUrl = nonEmpty(req.body?.source_url);
  const targetRole = nonEmpty(req.body?.target_role);
  const notes = nonEmpty(req.body?.notes);
  const label = nonEmpty(req.body?.label) || filename;
  const base64Raw = parseDataUrl(req.body?.content_base64);

  if (!sourceUrl && !base64Raw) {
    return res.status(400).json({ error: 'resume_source_required' });
  }

  try {
    const itemId = `resume-${Date.now().toString(36)}`;
    const now = new Date();
    let sizeBytes = 0;
    let storagePath = '';
    let storageProvider = 'none';

    if (sourceUrl) {
      storageProvider = 'external_url';
    } else if (base64Raw) {
      const buffer = Buffer.from(base64Raw, 'base64');
      sizeBytes = buffer.byteLength;
      if (sizeBytes > 6 * 1024 * 1024) {
        return res.status(413).json({ error: 'resume_too_large', max_bytes: 6 * 1024 * 1024 });
      }
      const bucket = storageBucketName ? admin.storage().bucket(storageBucketName) : null;
      if (bucket) {
        storagePath = `clients/${uid}/resumes/${itemId}-${filename}`;
        await bucket.file(storagePath).save(buffer, {
          resumable: false,
          metadata: { contentType: mimeType, cacheControl: 'private, max-age=0, no-store' },
        });
        storageProvider = 'gcs';
      }
    }

    const ref = clientAssetsRef(uid).doc(itemId);
    await ref.set({
      type: 'resume',
      label,
      status: 'active',
      filename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      source_url: sourceUrl,
      storage_path: storagePath,
      storage_provider: storageProvider,
      target_role: targetRole,
      notes,
      created_at: now,
      updated_at: now,
    });

    const saved = await ref.get();
    const data = saved.data() ?? {};
    return res.json({
      ok: true,
      item: {
        id: saved.id,
        type: data.type,
        label: data.label,
        status: data.status,
        filename: data.filename,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        source_url: data.source_url || '',
        storage_path: data.storage_path || '',
        storage_provider: data.storage_provider || 'none',
        target_role: data.target_role || '',
        notes: data.notes || '',
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: 'resume_upload_failed',
      detail: sanitizeError(error, 'resume_upload_failed'),
    });
  }
});

app.post('/v1/cjs/resume/review', requireAuth, async (req, res) => {
  try {
    assertAgentReadScope('resume_reviewer', ['clients/{uid}', 'clients/{uid}/assets/*', 'clients/{uid}/artifacts/cjs_execution']);
    assertAgentWriteScope('resume_reviewer', ['clients/{uid}/artifacts/resume_review', 'clients/{uid}/interactions/*']);
    const uid = req.user.uid;
    const [profile, resumeAssets] = await Promise.all([readClientProfile(uid), listResumeAssets(uid)]);
    const latestResume = resumeAssets[0];
    if (!latestResume) return res.status(400).json({ error: 'resume_required' });

    const review = buildResumeReview({ profile, resumeAsset: latestResume });
    await writeArtifactDoc(uid, 'resume_review', 'Resume Review', review);
    const interaction = await createInteraction({
      uid,
      type: 'human_validation',
      title: 'Resume review approval queue',
      summary: review.summary,
      nextActions: review.rewrite_focus,
      status: 'pending_approval',
      requiresApproval: true,
      source: 'resume_review',
    });

    return res.json({
      review,
      interaction_id: interaction.id,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'resume_review_failed',
      detail: sanitizeError(error, 'resume_review_failed'),
    });
  }
});

app.post('/v1/cjs/search/strategy', requireAuth, async (req, res) => {
  try {
    assertAgentReadScope('search_strategist', ['clients/{uid}', 'clients/{uid}/assets/*', 'clients/{uid}/artifacts/*']);
    assertAgentWriteScope('search_strategist', ['clients/{uid}/artifacts/search_strategy', 'clients/{uid}/interactions/*']);
    const uid = req.user.uid;
    const [profile, reviewSnap] = await Promise.all([
      readClientProfile(uid),
      clientArtifactsRef(uid).doc('resume_review').get(),
    ]);
    const strategy = buildSearchStrategy({
      profile,
      resumeReview: reviewSnap.exists ? reviewSnap.data()?.content : null,
    });
    await writeArtifactDoc(uid, 'search_strategy', 'Search Strategy', strategy);
    const interaction = await createInteraction({
      uid,
      type: 'human_validation',
      title: 'Search strategy approval queue',
      summary: strategy.headline,
      nextActions: strategy.weekly_actions,
      status: 'pending_approval',
      requiresApproval: true,
      source: 'search_strategy',
    });

    return res.json({
      strategy,
      interaction_id: interaction.id,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'search_strategy_failed',
      detail: sanitizeError(error, 'search_strategy_failed'),
    });
  }
});

app.get('/v1/interactions', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit || 40), 1), 120);
    const snap = await clientInteractionsRef(req.user.uid)
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .get();
    return res.json({
      items: snap.docs.map(serializeInteraction),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'interactions_list_failed',
      detail: sanitizeError(error, 'interactions_list_failed'),
    });
  }
});

app.get('/v1/admin/approval-queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit || 60), 1), 200);
    const clientsSnap = await db.collection('clients').select('display_name', 'email').get();
    const pendingRows = [];

    for (const clientSnap of clientsSnap.docs) {
      const interactionsSnap = await clientInteractionsRef(clientSnap.id)
        .where('status', '==', 'pending_approval')
        .limit(limit)
        .get();
      interactionsSnap.docs.forEach((interactionSnap) => {
        pendingRows.push(serializeInteraction(interactionSnap));
      });
    }

    pendingRows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    return res.json({
      items: pendingRows.slice(0, limit),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'approval_queue_failed',
      detail: sanitizeError(error, 'approval_queue_failed'),
    });
  }
});

app.post('/v1/interactions/chief-of-staff', requireAuth, async (req, res) => {
  const mode = nonEmpty(req.body?.mode) === 'logged' ? 'logged' : 'pending_approval';
  try {
    assertAgentReadScope('chief_of_staff', ['clients/{uid}', 'clients/{uid}/artifacts/*', 'clients/{uid}/interactions/*']);
    assertAgentWriteScope('chief_of_staff', ['clients/{uid}/interactions/*']);
    const uid = req.user.uid;
    const [profile, briefSnap, planSnap, episodeSnap] = await Promise.all([
      readClientProfile(uid),
      clientArtifactsRef(uid).doc('brief').get(),
      clientArtifactsRef(uid).doc('plan').get(),
      clientArtifactsRef(uid).doc('episodes_summary').get(),
    ]);
    const summary = buildChiefOfStaffSummary({
      profile,
      briefDoc: briefSnap.data()?.content,
      planDoc: planSnap.data()?.content,
      latestEpisode: episodeSnap.data()?.content,
    });
    const item = await createInteraction({
      uid,
      type: 'chief_of_staff_summary',
      title: summary.title,
      summary: summary.summary,
      nextActions: summary.next_actions,
      status: mode,
      requiresApproval: mode === 'pending_approval',
      source: 'chief_of_staff',
    });
    return res.json({
      ok: true,
      item: {
        id: item.id,
        type: item.type,
        title: item.title,
        summary: item.summary,
        status: item.status,
        requires_approval: Boolean(item.requires_approval),
        next_actions: Array.isArray(item.next_actions) ? item.next_actions : [],
        decision_note: nonEmpty(item.decision_note),
        created_at: toIso(item.created_at),
        updated_at: toIso(item.updated_at),
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: 'chief_of_staff_failed',
      detail: sanitizeError(error, 'chief_of_staff_failed'),
    });
  }
});

app.post('/v1/interactions/:interactionId/decision', requireAuth, requireAdmin, async (req, res) => {
  const interactionId = nonEmpty(req.params?.interactionId);
  const decision = nonEmpty(req.body?.decision);
  const note = nonEmpty(req.body?.note) || '';
  if (!interactionId) return res.status(400).json({ error: 'interaction_id_required' });
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });

  try {
    const ref = clientInteractionsRef(req.user.uid).doc(interactionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'interaction_not_found' });
    await ref.set(
      {
        status: decision,
        decision_note: note,
        decided_by: req.user.email ?? req.user.uid,
        updated_at: new Date(),
      },
      { merge: true }
    );
    const updated = await ref.get();
    return res.json({
      ok: true,
      item: serializeInteraction(updated),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'interaction_decision_failed',
      detail: sanitizeError(error, 'interaction_decision_failed'),
    });
  }
});

app.post('/v1/admin/approval-queue/:clientUid/:interactionId/decision', requireAuth, requireAdmin, async (req, res) => {
  const clientUid = nonEmpty(req.params?.clientUid);
  const interactionId = nonEmpty(req.params?.interactionId);
  const decision = nonEmpty(req.body?.decision);
  const note = nonEmpty(req.body?.note) || '';
  if (!clientUid) return res.status(400).json({ error: 'client_uid_required' });
  if (!interactionId) return res.status(400).json({ error: 'interaction_id_required' });
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });

  try {
    const ref = clientInteractionsRef(clientUid).doc(interactionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'interaction_not_found' });
    await ref.set(
      {
        status: decision,
        decision_note: note,
        decided_by: req.user.email ?? req.user.uid,
        updated_at: new Date(),
      },
      { merge: true }
    );
    const updated = await ref.get();
    return res.json({
      ok: true,
      item: serializeInteraction(updated),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_interaction_decision_failed',
      detail: sanitizeError(error, 'admin_interaction_decision_failed'),
    });
  }
});

// B.I.N.G.E: Generate one episode (fast).
app.post('/v1/binge/episode', requireAuth, async (req, res) => {
  const { dna, target_skill } = req.body ?? {};
  const uid = req.user.uid;
  const runtimeConfig = await loadAppConfig();
  const bingeModel = runtimeConfig.generation.binge_model || fastTextModel;
  const bingeTemperature = runtimeConfig.generation.binge_temperature;
  const bingeAppendix = runtimeConfig.prompts.binge_appendix;
  const toneGuardEnabled = runtimeConfig.safety.tone_guard_enabled;
  const persistedDna = await loadClientDna(uid);
  const hydratedDna = { ...persistedDna, ...(dna ?? {}) };
  const skill = deriveEpisodeTargetSkill({ dna: hydratedDna, explicitSkill: target_skill });

  if (!ai) {
    return res.json(
      stubEpisode(
        runtimeConfig,
        'noai',
        baseMeta('fallback', true, {
          reason: 'missing_gemini_api_key',
          uid,
          prompt_version: ROM_VERSION,
          model: 'deterministic-fallback',
        })
      )
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: bingeModel,
      contents: `${composeBingePrompt({ dna: hydratedDna, targetSkill: skill })}${
        bingeAppendix ? `\n\nAdditional system appendix:\n${bingeAppendix}` : ''
      }`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: EPISODE_SCHEMA,
        systemInstruction: bingeSystemInstruction(runtimeConfig),
        temperature: bingeTemperature
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error('empty_model_response');
    const episode = withEpisodeMediaHints(safeParseJson(text), runtimeConfig);
    if (toneGuardEnabled) {
      const toneViolations = findToneViolations(episode);
      if (toneViolations.length) {
        throw new Error(`tone_violation:${toneViolations.join(',')}`);
      }
    }

    return res.json({
      ...episode,
      _meta: baseMeta('gemini', false, { uid, target_skill: skill, model: bingeModel }),
    });
  } catch (e) {
    console.error('binge generation error', e);
    return res.json(
      stubEpisode(
        runtimeConfig,
        'err',
        baseMeta('fallback', true, {
          uid,
          target_skill: skill,
          reason: String(e?.message ?? 'episode_generation_failed'),
        })
      )
    );
  }
});

// Generate one semantic media pack (image + video operation) for the current episode narrative.
app.post('/v1/binge/media-pack', requireAuth, async (req, res) => {
  const { episode, dna, target_skill } = req.body ?? {};
  const runtimeConfig = await loadAppConfig();
  const episodeId = nonEmpty(episode?.episode_id) || `ep-${Date.now().toString(36)}`;
  const direction = buildMediaDirection({
    episode,
    dna,
    targetSkill: target_skill,
    runtimeConfig,
  });

  if (!runtimeConfig.media.enabled) {
    return res.json(
      buildMediaFallbackPack({
        episodeId,
        runtimeConfig,
        direction,
        reason: 'media_module_disabled',
      })
    );
  }

  if (!ai) {
    return res.json(
      buildMediaFallbackPack({
        episodeId,
        runtimeConfig,
        direction,
        reason: 'missing_gemini_api_key',
      })
    );
  }

  try {
    const [imageAsset, videoAsset] = await Promise.all([
      generateImageAsset({ runtimeConfig, direction }),
      generateVideoAsset({ runtimeConfig, direction }),
    ]);

    const degraded = imageAsset.status !== 'generated' || videoAsset.status === 'unavailable';
    return res.json({
      episode_id: episodeId,
      narrative: direction.narrative,
      generated_at: new Date().toISOString(),
      degraded,
      assets: [imageAsset, videoAsset],
    });
  } catch (error) {
    console.error('media_pack_error', error);
    return res.json(
      buildMediaFallbackPack({
        episodeId,
        runtimeConfig,
        direction,
        reason: sanitizeError(error, 'media_pack_failed'),
      })
    );
  }
});

app.post('/v1/binge/media-pack/video-status', requireAuth, async (req, res) => {
  const operationName = nonEmpty(req.body?.operation_name);
  if (!operationName) {
    return res.status(400).json({ error: 'operation_name_required' });
  }
  if (!ai) {
    return res.status(503).json({ error: 'missing_gemini_api_key' });
  }

  try {
    const operation = await ai.operations.getVideosOperation({
      operation: { name: operationName },
    });
    const videoUri = nonEmpty(operation?.response?.generatedVideos?.[0]?.video?.uri);

    return res.json({
      operation_name: operation?.name || operationName,
      done: Boolean(operation?.done),
      video_uri: videoUri || null,
      error: operation?.error ?? null,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'video_status_failed',
      detail: sanitizeError(error, 'video_status_failed'),
    });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`career-concierge-api listening on :${port}`);
});
