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
    const pendingRows = [];
    const queueClientIds = new Set();
    let hydratedAccountCount = 0;
    let queueWarning = '';

    try {
      const clientsSnap = await db
        .collection('clients')
        .select('display_name', 'email', 'account', 'demo_profile')
        .get();

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
    } catch (error) {
      queueWarning = sanitizeError(error, 'admin_queue_unavailable');
      console.warn('admin_system_overview_queue_unavailable', queueWarning);
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
        warning: queueWarning,
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

app.get('/v1/admin/media-pipeline', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const warnings = [];
    const jobs = [];
    const manifests = [];
    const clientsSnap = await db.collection('clients').select('display_name', 'email').get();

    for (const clientSnap of clientsSnap.docs) {
      const clientData = clientSnap.data() ?? {};
      const uid = clientSnap.id;
      let resolutionSummary = null;

      try {
        const runSnap = await clientOrchestrationRunsRef(uid).doc('content_director_phase_a').get();
        if (runSnap.exists) {
          resolutionSummary = runSnap.data()?.media_resolution?.summary ?? null;
        }
      } catch (error) {
        warnings.push(`resolution_unavailable:${uid}:${sanitizeError(error, 'resolution_unavailable')}`);
      }

      try {
        const jobsSnap = await clientMediaJobsRef(uid).orderBy('updated_at', 'desc').limit(4).get();
        jobsSnap.docs.forEach((snap) => {
          jobs.push(serializeAdminMediaJob({ uid, clientData, jobData: snap.data() ?? {} }));
        });
      } catch (error) {
        warnings.push(`jobs_unavailable:${uid}:${sanitizeError(error, 'jobs_unavailable')}`);
      }

      try {
        const manifestsSnap = await clientMediaManifestsRef(uid).orderBy('updated_at', 'desc').limit(3).get();
        manifestsSnap.docs.forEach((snap) => {
          manifests.push(
            serializeAdminMediaManifest({
              uid,
              clientData,
              manifestData: snap.data() ?? {},
              resolutionSummary,
            })
          );
        });
      } catch (error) {
        warnings.push(`manifests_unavailable:${uid}:${sanitizeError(error, 'manifests_unavailable')}`);
      }
    }

    jobs.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    manifests.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

    const visibleJobs = jobs.slice(0, 18);
    const visibleManifests = manifests.slice(0, 12);

    return res.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_jobs: jobs.length,
        queued_jobs: jobs.filter((job) => job.status === 'queued').length,
        degraded_jobs: jobs.filter((job) => job.status === 'degraded').length,
        completed_jobs: jobs.filter((job) => job.status === 'completed').length,
        retry_requested_jobs: jobs.filter((job) => Number(job.retry_requested_count || 0) > 0).length,
        manifests_needing_review: manifests.filter((manifest) => manifest.review_state !== 'approved').length,
        reusable_gap_count: manifests.reduce((sum, manifest) => sum + Number(manifest.reusable_gap_count || 0), 0),
        bespoke_gap_count: manifests.reduce((sum, manifest) => sum + Number(manifest.bespoke_gap_count || 0), 0),
      },
      jobs: visibleJobs,
      manifests: visibleManifests,
      warnings: warnings.slice(0, 8),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_media_pipeline_failed',
      detail: sanitizeError(error, 'admin_media_pipeline_failed'),
    });
  }
});

app.post('/v1/admin/media-pipeline/jobs/:clientUid/:jobId/retry', requireAuth, requireAdmin, async (req, res) => {
  const clientUid = nonEmpty(req.params?.clientUid);
  const jobId = nonEmpty(req.params?.jobId);
  if (!clientUid || !jobId) return res.status(400).json({ error: 'missing_job_ref' });

  try {
    const jobRef = clientMediaJobsRef(clientUid).doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return res.status(404).json({ error: 'job_not_found' });
    const jobData = jobSnap.data() ?? {};
    const manifestId = nonEmpty(jobData?.manifest_id) || nonEmpty(jobData?.episode_id);
    const now = new Date();
    const nextRetryCount = Number(jobData?.retry_requested_count || 0) + 1;

    await jobRef.set(
      {
        retry_requested_count: nextRetryCount,
        retry_requested_at: now,
        retry_requested_by: req.user.email ?? req.user.uid,
        review_state: 'needs_review',
        updated_at: now,
      },
      { merge: true }
    );

    if (manifestId) {
      await clientMediaManifestsRef(clientUid).doc(manifestId).set(
        {
          review_state: 'needs_review',
          retry_requested_count: nextRetryCount,
          retry_requested_at: now,
          updated_at: now,
        },
        { merge: true }
      );
    }

    return res.json({ ok: true, job_id: jobId, retry_requested_count: nextRetryCount });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_media_retry_failed',
      detail: sanitizeError(error, 'admin_media_retry_failed'),
    });
  }
});

app.post('/v1/admin/media-pipeline/manifests/:clientUid/:manifestId/review', requireAuth, requireAdmin, async (req, res) => {
  const clientUid = nonEmpty(req.params?.clientUid);
  const manifestId = nonEmpty(req.params?.manifestId);
  const decision = nonEmpty(req.body?.decision).toLowerCase();
  if (!clientUid || !manifestId) return res.status(400).json({ error: 'missing_manifest_ref' });
  if (!['approved', 'needs_review', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_decision' });
  }

  try {
    const manifestRef = clientMediaManifestsRef(clientUid).doc(manifestId);
    const manifestSnap = await manifestRef.get();
    if (!manifestSnap.exists) return res.status(404).json({ error: 'manifest_not_found' });
    const manifestData = manifestSnap.data() ?? {};
    const jobId = nonEmpty(manifestData?.job_id);
    const now = new Date();

    await manifestRef.set(
      {
        review_state: decision,
        reviewed_at: now,
        reviewed_by: req.user.email ?? req.user.uid,
        updated_at: now,
      },
      { merge: true }
    );

    if (jobId) {
      await clientMediaJobsRef(clientUid).doc(jobId).set(
        {
          review_state: decision,
          updated_at: now,
        },
        { merge: true }
      );
    }

    return res.json({ ok: true, manifest_id: manifestId, review_state: decision });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_media_review_failed',
      detail: sanitizeError(error, 'admin_media_review_failed'),
    });
  }
});

app.get('/v1/admin/orchestration-control-plane', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureGovernanceDocs();
    const clientsSnap = await db.collection('clients').select('display_name', 'email').get();
    const runs = [];

    for (const clientSnap of clientsSnap.docs) {
      const uid = clientSnap.id;
      const clientData = clientSnap.data() ?? {};
      try {
        const runsSnap = await clientOrchestrationRunsRef(uid).orderBy('updated_at', 'desc').limit(4).get();
        runsSnap.docs.forEach((runSnap) => {
          runs.push(serializeAdminOrchestrationRun({ uid, clientData, runData: runSnap.data() ?? {} }));
        });
      } catch (error) {
        console.warn('orchestration_runs_unavailable', uid, sanitizeError(error, 'orchestration_runs_unavailable'));
      }
    }

    runs.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const visibleRuns = runs.slice(0, 18);
    const averageConfidence = visibleRuns.length
      ? visibleRuns.reduce((sum, run) => sum + Number(run.confidence || 0), 0) / visibleRuns.length
      : 0;

    return res.json({
      generated_at: new Date().toISOString(),
      summary: {
        role_count: AGENT_REGISTRY.length,
        run_count: runs.length,
        average_confidence: Number(averageConfidence.toFixed(2)),
        approval_required_runs: visibleRuns.filter((run) => run.approval_state !== 'not_required').length,
      },
      policy: DEFAULT_ORCHESTRATION_POLICY,
      registry: AGENT_REGISTRY,
      runs: visibleRuns,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'admin_orchestration_overview_failed',
      detail: sanitizeError(error, 'admin_orchestration_overview_failed'),
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

const uniqueList = (entries) => [...new Set(toStringList(entries))];

const buildContentDirectorSeeds = ({ intent, preferences, answers = {}, artifacts = {}, meta = {} }) => {
  const currentTitle = nonEmpty(answers.current_title || answers.current_or_target_job_title) || 'current role';
  const targetRole = nonEmpty(answers.target || answers.current_or_target_job_title) || 'next role';
  const industry = nonEmpty(answers.industry) || 'cross-industry';
  const modalities = uniqueList(answers.learning_modalities).slice(0, 3);
  const foundational = uniqueList(answers.foundational_interests).slice(0, 2);
  const advanced = uniqueList(answers.advanced_interests).slice(0, 2);
  const briefLearned = uniqueList(artifacts?.brief?.learned).slice(0, 3);
  const leverage = uniqueList(artifacts?.profile?.leverage).slice(0, 2);
  const nearTermGaps = uniqueList(artifacts?.gaps?.near_term).slice(0, 2);
  const nextMoves = Array.isArray(artifacts?.plan?.next_72_hours)
    ? artifacts.plan.next_72_hours
        .map((item) => nonEmpty(item?.label))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const learningThemes = uniqueList([...foundational, ...advanced, ...briefLearned, ...leverage]).slice(0, 4);
  const reusableAssetTags = uniqueList([
    'editorial_grid',
    'llm_metaphor',
    'operator_console',
    industry !== 'cross-industry' ? industry.toLowerCase() : '',
    intent,
    preferences?.focus || '',
    preferences?.pace || '',
    ...foundational.map((entry) => entry.toLowerCase()),
  ]).slice(0, 6);
  const bespokeCandidates = uniqueList([
    industry !== 'cross-industry' ? `${industry} environment cues` : '',
    `${currentTitle} operating reality`,
    `${targetRole} transition stakes`,
    ...nearTermGaps,
  ]).slice(0, 4);
  const targetSkill = deriveEpisodeTargetSkill({
    dna: {
      ...answers,
      intent,
      industry,
      foundational_interests: foundational,
      advanced_interests: advanced,
    },
  });

  const episodeBlueprints = [
    {
      id: 'episode-01',
      title: intent === 'target_role' ? 'The Promotion Signal' : intent === 'not_sure' ? 'The Pattern Hunt' : 'The Leverage Audit',
      objective:
        intent === 'target_role'
          ? `Frame ${currentTitle} experience as evidence for ${targetRole}.`
          : intent === 'not_sure'
            ? 'Turn diffuse signals into a credible direction hypothesis.'
            : 'Convert current execution into clearer leadership leverage.',
      reusable_asset_tags: uniqueList([...reusableAssetTags, 'cold_open', 'prestige_office']).slice(0, 6),
      bespoke_candidates: uniqueList([`${industry} establishing shot`, `${currentTitle} decision desk`]).slice(0, 3),
    },
    {
      id: 'episode-02',
      title: 'How the System Works',
      objective: `Teach ${targetSkill} through narrative beats instead of generic instruction.`,
      reusable_asset_tags: uniqueList([...reusableAssetTags, 'llm_metaphor', 'systems_animation']).slice(0, 6),
      bespoke_candidates: uniqueList([`${industry} workflow`, ...modalities]).slice(0, 3),
    },
    {
      id: 'episode-03',
      title: 'The Rehearsal Loop',
      objective: nextMoves[0] || 'Translate planning into one concrete rehearsal and one executive-facing proof move.',
      reusable_asset_tags: uniqueList([...reusableAssetTags, 'challenge_overlay', 'execution_rehearsal']).slice(0, 6),
      bespoke_candidates: uniqueList([`${targetRole} scenario rehearsal`, ...nearTermGaps]).slice(0, 3),
    },
  ];

  return {
    learningPlan: {
      plan_id: 'content_director_phase_a',
      source: 'content_director',
      phase: 'phase_a',
      status: 'seeded',
      generated_at: meta.generated_at || new Date().toISOString(),
      signal_threshold: 'intake_plus_first_order_artifacts',
      summary: `Phase A seed for ${intent} journey in ${industry}.`,
      intent,
      preferences,
      modalities,
      current_title: currentTitle,
      target_role: targetRole,
      industry,
      learning_themes: learningThemes,
      reusable_asset_tags: reusableAssetTags,
      bespoke_candidates: bespokeCandidates,
      next_moves: nextMoves,
      source_artifacts: ['brief', 'plan', 'profile', 'ai_profile', 'gaps'],
      source_meta: meta,
    },
    episodePlan: {
      plan_id: 'content_director_phase_a',
      source: 'content_director',
      phase: 'phase_a',
      status: 'seeded',
      generated_at: meta.generated_at || new Date().toISOString(),
      target_skill: targetSkill,
      episode_count: episodeBlueprints.length,
      episodes: episodeBlueprints.map((episode, index) => ({
        ...episode,
        order: index + 1,
        asset_strategy: 'reusable_first',
        source_artifacts: ['brief', 'profile', 'gaps'],
      })),
      source_meta: meta,
    },
  };
};

const seedContentDirectorPlanning = async ({ uid, intent, preferences, answers, artifacts, meta }) => {
  const seeds = buildContentDirectorSeeds({ intent, preferences, answers, artifacts, meta });
  const now = new Date();
  const runId = 'content_director_phase_a';
  const nextRoles = ['media_librarian', 'media_pipeline_worker', 'evaluator'];
  const tier = inferTierFromSignal({ answers, preferences });

  await Promise.all([
    clientLearningPlansRef(uid).doc('content_director_phase_a').set(
      {
        ...seeds.learningPlan,
        updated_at: now,
      },
      { merge: true }
    ),
    clientEpisodePlansRef(uid).doc('content_director_phase_a').set(
      {
        ...seeds.episodePlan,
        updated_at: now,
      },
      { merge: true }
    ),
    clientOrchestrationRunsRef(uid).doc(runId).set(
      {
        run_id: runId,
        client_uid: uid,
        agent_role: 'content_director',
        started_by_role: 'content_director',
        phase: 'phase_a',
        status: 'seeded',
        trigger: 'suite_generate',
        signal_threshold: 'intake_plus_first_order_artifacts',
        intent,
        tier,
        preferences,
        summary: `Content Director seeded a reusable-first episode plan for the ${intent} journey.`,
        confidence: 0.78,
        approval_state: tier === 'free_foundation' ? 'not_required' : 'operator_review_available',
        evidence_refs: [
          `clients/${uid}`,
          `clients/${uid}/artifacts/brief`,
          `clients/${uid}/artifacts/profile`,
          `clients/${uid}/artifacts/gaps`,
        ],
        artifact_refs: ['brief', 'plan', 'profile', 'ai_profile', 'gaps'].map((key) => `clients/${uid}/artifacts/${key}`),
        next_roles: nextRoles,
        generated_at: meta.generated_at || now.toISOString(),
        created_at: now,
        updated_at: now,
        learning_plan_ref: `clients/${uid}/learning_plans/content_director_phase_a`,
        episode_plan_ref: `clients/${uid}/episode_plans/content_director_phase_a`,
        source_artifacts: ['brief', 'plan', 'profile', 'ai_profile', 'gaps'],
        policy_version: DEFAULT_ORCHESTRATION_POLICY.version,
        source_meta: meta,
      },
      { merge: true }
    ),
  ]);

  return {
    run_id: runId,
    learning_plan_id: 'content_director_phase_a',
    episode_plan_id: 'content_director_phase_a',
    status: 'seeded',
  };
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

const loadContentDirectorEpisodePlan = async (uid) => {
  try {
    const snap = await clientEpisodePlansRef(uid).doc('content_director_phase_a').get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    console.error('content_director_episode_plan_load_error', error);
    return null;
  }
};

const normalizeLibraryTag = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildLibraryTagSet = (entries) =>
  new Set(
    toStringList(entries)
      .map((entry) => normalizeLibraryTag(entry))
      .filter(Boolean)
  );

const buildLibraryFirstResolution = ({ items, episodePlan, surface }) => {
  if (!episodePlan || !Array.isArray(episodePlan.episodes) || !episodePlan.episodes.length) {
    return {
      strategy: 'library_first',
      status: 'no_plan',
      surface,
      plan_id: null,
      resolved_at: new Date().toISOString(),
      summary: {
        resolved_episode_count: 0,
        reused_asset_count: 0,
        reusable_gap_count: 0,
        bespoke_gap_count: 0,
      },
      episodes: [],
    };
  }

  const reusedAssetIds = new Set();
  let reusableGapCount = 0;
  let bespokeGapCount = 0;

  const episodes = episodePlan.episodes.map((episode) => {
    const reusableTags = toStringList(episode?.reusable_asset_tags);
    const bespokeCandidates = toStringList(episode?.bespoke_candidates);
    const reusableTagSet = buildLibraryTagSet(reusableTags);
    const rankedMatches = items
      .map((item) => {
        const itemTagSet = buildLibraryTagSet(item?.tags);
        const sharedTags = [...reusableTagSet].filter((tag) => itemTagSet.has(tag));
        return {
          item,
          sharedTags,
          score: sharedTags.length,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const pa = Number.isFinite(Number(a.item?.priority)) ? Number(a.item.priority) : 100;
        const pb = Number.isFinite(Number(b.item?.priority)) ? Number(b.item.priority) : 100;
        return pa - pb;
      });

    const selectedMatches = rankedMatches.slice(0, 3);
    const matchedTagSet = new Set(selectedMatches.flatMap((entry) => entry.sharedTags));
    const unmatchedReusableTags = reusableTags.filter(
      (tag) => !matchedTagSet.has(normalizeLibraryTag(tag))
    );
    const reusableGaps = unmatchedReusableTags.map((tag) => ({
      need: tag,
      classification: 'reusable_kit',
      reason: 'No approved library asset currently satisfies this reusable tag.',
    }));
    const bespokeGaps = bespokeCandidates.map((need) => ({
      need,
      classification: 'bespoke',
      reason: 'This need is specific to the client narrative and should not be fulfilled by a generic library asset.',
    }));

    selectedMatches.forEach((entry) => reusedAssetIds.add(entry.item.id));
    reusableGapCount += reusableGaps.length;
    bespokeGapCount += bespokeGaps.length;

    const coverage =
      selectedMatches.length > 0 && reusableGaps.length === 0
        ? 'reused'
        : selectedMatches.length > 0 || reusableGaps.length > 0
          ? 'mixed'
          : bespokeGaps.length > 0
          ? 'bespoke_only'
          : 'no_library_match';

    return {
      episode_id: String(episode?.id || `episode-${Number(episode?.order || 0) + 1}`),
      title: String(episode?.title || 'Untitled episode'),
      objective: String(episode?.objective || ''),
      coverage,
      matched_asset_ids: selectedMatches.map((entry) => entry.item.id),
      matched_asset_titles: selectedMatches.map((entry) => entry.item.title || entry.item.id),
      matched_tags: [...matchedTagSet],
      unmatched_reusable_tags: unmatchedReusableTags,
      gap_analysis: [...reusableGaps, ...bespokeGaps],
    };
  });

  return {
    strategy: 'library_first',
    status: 'plan_backed',
    surface,
    plan_id: String(episodePlan.plan_id || 'content_director_phase_a'),
    resolved_at: new Date().toISOString(),
    summary: {
      resolved_episode_count: episodes.length,
      reused_asset_count: reusedAssetIds.size,
      reusable_gap_count: reusableGapCount,
      bespoke_gap_count: bespokeGapCount,
    },
    episodes,
  };
};

const persistLibraryFirstResolution = async ({ uid, resolution }) => {
  if (!resolution || resolution.status !== 'plan_backed' || !resolution.plan_id) return;
  try {
    const runRef = clientOrchestrationRunsRef(uid).doc(resolution.plan_id);
    const existingSnap = await runRef.get();
    const nextResolution = {
      strategy: resolution.strategy,
      status: resolution.status,
      surface: resolution.surface,
      plan_id: resolution.plan_id,
      resolved_at: resolution.resolved_at,
      summary: resolution.summary,
      episodes: resolution.episodes,
    };
    const existingResolution =
      existingSnap.exists && existingSnap.data()?.media_resolution
        ? existingSnap.data().media_resolution
        : null;
    if (JSON.stringify(existingResolution) === JSON.stringify(nextResolution)) {
      return;
    }
    await clientOrchestrationRunsRef(uid).doc(resolution.plan_id).set(
      {
        media_resolution: nextResolution,
        updated_at: new Date(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('library_resolution_persist_error', error);
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
  {
    role_id: 'content_director',
    title: 'Content Director',
    objective: 'Seed learning and episode plans once intake and first-order artifact signal are available.',
    reads: ['clients/{uid}', 'clients/{uid}/artifacts/*'],
    writes: ['clients/{uid}/learning_plans/*', 'clients/{uid}/episode_plans/*', 'clients/{uid}/orchestration_runs/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-06.1',
  },
  {
    role_id: 'intake_concierge',
    title: 'Intake Concierge',
    objective: 'Normalize intake signal into intent, modality, and constraints for downstream staff.',
    reads: ['clients/{uid}', 'clients/{uid}/interactions/*'],
    writes: ['clients/{uid}', 'clients/{uid}/orchestration_runs/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'artifact_composer_pack',
    title: 'Artifact Composer Pack',
    objective: 'Generate the core suite artifacts without splitting every artifact into a separate autonomous role.',
    reads: ['clients/{uid}', 'clients/{uid}/artifacts/*'],
    writes: ['clients/{uid}/artifacts/*', 'clients/{uid}/orchestration_runs/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'myconcierge_guide',
    title: 'MyConcierge Guide',
    objective: 'Answer directional questions using the user artifact stack and current journey intent.',
    reads: ['clients/{uid}', 'clients/{uid}/artifacts/*', 'clients/{uid}/interactions/*'],
    writes: ['clients/{uid}/interactions/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'episode_showrunner',
    title: 'Episode Showrunner',
    objective: 'Convert learning context into narrative episode beats, overlays, and challenge structure.',
    reads: ['clients/{uid}', 'clients/{uid}/learning_plans/*', 'clients/{uid}/episode_plans/*'],
    writes: ['clients/{uid}/episode_plans/*', 'clients/{uid}/orchestration_runs/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'media_librarian',
    title: 'Media Librarian',
    objective: 'Curate, tag, and govern reusable concept media before bespoke generation is requested.',
    reads: ['system/media_library/*', 'clients/{uid}/episode_plans/*', 'clients/{uid}/orchestration_runs/*'],
    writes: ['system/media_library/*', 'clients/{uid}/orchestration_runs/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'media_pipeline_worker',
    title: 'Media Pipeline Worker',
    objective: 'Execute long-running image and video generation jobs and persist results to storage and manifests.',
    reads: ['clients/{uid}/media_jobs/*', 'clients/{uid}/media_manifests/*'],
    writes: ['clients/{uid}/media_jobs/*', 'clients/{uid}/media_manifests/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'evaluator',
    title: 'Evaluator',
    objective: 'Score confidence, policy compliance, and evidence sufficiency for orchestration outputs.',
    reads: ['clients/{uid}/orchestration_runs/*', 'clients/{uid}/artifacts/*', 'clients/{uid}/interactions/*'],
    writes: ['clients/{uid}/orchestration_runs/*'],
    approval_required: false,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'human_concierge_coach',
    title: 'Human Concierge Coach',
    objective: 'Handle premium-touch escalations and sensitive guidance moments that should not auto-resolve.',
    reads: ['clients/{uid}', 'clients/{uid}/artifacts/*', 'clients/{uid}/interactions/*', 'clients/{uid}/orchestration_runs/*'],
    writes: ['clients/{uid}/interactions/*', 'clients/{uid}/orchestration_runs/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
  {
    role_id: 'admin_operator',
    title: 'Admin Operator',
    objective: 'Configure policy, inspect runs, manage failures, and keep the operating system healthy.',
    reads: ['system/*', 'clients/{uid}/orchestration_runs/*', 'clients/{uid}/interactions/*', 'clients/{uid}/media_jobs/*'],
    writes: ['system/*', 'clients/{uid}/interactions/*', 'clients/{uid}/media_jobs/*', 'clients/{uid}/media_manifests/*'],
    approval_required: true,
    access_model: 'read_write_scoped',
    policy_version: '2026-03-08.1',
  },
];

const DEFAULT_ORCHESTRATION_POLICY = {
  policy_id: 'default',
  version: '2026-03-08.1',
  current_stack: ['web_os', 'express_api', 'cloud_run', 'firestore', 'cloud_storage', 'gemini'],
  paid_roles: [
    'chief_of_staff',
    'intake_concierge',
    'artifact_composer_pack',
    'myconcierge_guide',
    'resume_reviewer',
    'search_strategist',
    'episode_showrunner',
    'content_director',
    'media_librarian',
    'media_pipeline_worker',
    'evaluator',
    'human_concierge_coach',
  ],
  free_roles: ['intake_concierge', 'artifact_composer_pack', 'episode_showrunner'],
  approval_triggers: [
    'outbound_message',
    'employer_specific_claim',
    'sensitive_bespoke_media',
    'premium_human_handoff',
    'publish_state_change',
  ],
  evaluation_signals: ['confidence', 'approval_state', 'evidence_refs', 'policy_flags'],
  intent_routes: [
    {
      intent: 'current_role',
      primary_roles: ['chief_of_staff', 'artifact_composer_pack', 'episode_showrunner'],
      handoff_order: ['chief_of_staff', 'artifact_composer_pack', 'episode_showrunner', 'content_director'],
      premium_human_handoff: false,
    },
    {
      intent: 'target_role',
      primary_roles: ['chief_of_staff', 'artifact_composer_pack', 'search_strategist', 'resume_reviewer'],
      handoff_order: ['chief_of_staff', 'artifact_composer_pack', 'search_strategist', 'resume_reviewer', 'content_director'],
      premium_human_handoff: true,
    },
    {
      intent: 'not_sure',
      primary_roles: ['chief_of_staff', 'artifact_composer_pack', 'myconcierge_guide', 'episode_showrunner'],
      handoff_order: ['chief_of_staff', 'artifact_composer_pack', 'myconcierge_guide', 'episode_showrunner', 'content_director'],
      premium_human_handoff: true,
    },
  ],
};

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
const clientLearningPlansRef = (uid) => clientRef(uid).collection('learning_plans');
const clientEpisodePlansRef = (uid) => clientRef(uid).collection('episode_plans');
const clientOrchestrationRunsRef = (uid) => clientRef(uid).collection('orchestration_runs');
const clientMediaJobsRef = (uid) => clientRef(uid).collection('media_jobs');
const clientMediaManifestsRef = (uid) => clientRef(uid).collection('media_manifests');

const ensureGovernanceDocs = async () => {
  await Promise.all([
    db.collection('system').doc('agent-registry').set(
      {
        items: AGENT_REGISTRY,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    ),
    db.collection('system').doc('orchestration-policies').set(
      {
        default: DEFAULT_ORCHESTRATION_POLICY,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    ),
    db.collection('system').doc('evaluation-policies').set(
      {
        default: {
          version: '2026-03-08.1',
          signals: DEFAULT_ORCHESTRATION_POLICY.evaluation_signals,
          gate_when_confidence_below: 0.6,
        },
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    ),
  ]);
};

const inferTierFromSignal = ({ answers, preferences }) => {
  const raw = [
    nonEmpty(answers?.account_type),
    nonEmpty(answers?.tier),
    nonEmpty(answers?.package_name),
    nonEmpty(preferences?.tier),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (raw.includes('free')) return 'free_foundation';
  return 'paid';
};

const nextRolesForIntent = (intent) =>
  DEFAULT_ORCHESTRATION_POLICY.intent_routes.find((route) => route.intent === intent)?.handoff_order ?? [
    'chief_of_staff',
    'artifact_composer_pack',
  ];

const recordChiefOfStaffRun = async ({ uid, intent, preferences, answers, meta, artifacts, status }) => {
  const now = new Date();
  const runId = `chief_of_staff_${now.getTime().toString(36)}`;
  const artifactKeys = Object.keys(artifacts ?? {});
  const nextRoles = nextRolesForIntent(intent);
  const confidence = meta?.fallback ? 0.58 : 0.86;
  await clientOrchestrationRunsRef(uid).doc(runId).set(
    {
      run_id: runId,
      client_uid: uid,
      started_by_role: 'chief_of_staff',
      trigger: 'suite_generate',
      status,
      intent,
      tier: inferTierFromSignal({ answers, preferences }),
      summary: `Chief of Staff routed a ${intent} journey into ${nextRoles.slice(1, 3).join(' + ')}.`,
      confidence,
      approval_state: 'not_required',
      evidence_refs: ['clients/{uid}', 'clients/{uid}/artifacts/brief', 'clients/{uid}/artifacts/plan'],
      artifact_refs: artifactKeys.map((key) => `clients/${uid}/artifacts/${key}`),
      next_roles: nextRoles,
      policy_version: DEFAULT_ORCHESTRATION_POLICY.version,
      source_meta: meta,
      created_at: now,
      updated_at: now,
    },
    { merge: true }
  );
  return { run_id: runId, confidence };
};

const parseDataUrl = (input) => {
  const raw = nonEmpty(input);
  if (!raw) return '';
  const m = raw.match(/^data:.*;base64,(.+)$/);
  return m ? m[1] : raw;
};

const persistMediaAssetRecord = async ({ uid, jobId, asset, generatedAt }) => {
  const persisted = {
    kind: asset.kind,
    model: asset.model,
    prompt: asset.prompt,
    status: asset.status,
    note: nonEmpty(asset.note),
    storage_provider: 'none',
    storage_path: '',
    source_url: '',
    video_operation_name: nonEmpty(asset.video_operation_name),
    video_done: Boolean(asset.video_done),
  };

  if (asset.kind === 'image' && nonEmpty(asset.image_data_url) && storageBucketName) {
    try {
      const base64 = parseDataUrl(asset.image_data_url);
      if (base64) {
        const bucket = admin.storage().bucket(storageBucketName);
        const storagePath = `clients/${uid}/media/${jobId}/${asset.kind}-${generatedAt.getTime()}.jpg`;
        await bucket.file(storagePath).save(Buffer.from(base64, 'base64'), {
          resumable: false,
          metadata: { contentType: 'image/jpeg', cacheControl: 'private, max-age=0, no-store' },
        });
        persisted.storage_provider = 'gcs';
        persisted.storage_path = storagePath;
      }
    } catch (error) {
      console.error('media_asset_storage_error', error);
      persisted.note = [persisted.note, 'Image persistence failed.'].filter(Boolean).join(' ');
    }
  }

  if (asset.kind === 'video' && nonEmpty(asset.video_uri)) {
    persisted.storage_provider = 'gemini_uri';
    persisted.source_url = nonEmpty(asset.video_uri);
  }

  return persisted;
};

const persistMediaPipelineArtifacts = async ({ uid, episodeId, direction, pack }) => {
  const now = new Date();
  const jobId = `media-job-${now.getTime().toString(36)}`;
  const manifestId = episodeId;
  const persistedAssets = await Promise.all(
    (Array.isArray(pack.assets) ? pack.assets : []).map((asset) =>
      persistMediaAssetRecord({ uid, jobId, asset, generatedAt: now })
    )
  );
  const pipelineStatus = persistedAssets.some((asset) => asset.status === 'queued')
    ? 'queued'
    : pack.degraded
      ? 'degraded'
      : 'completed';
  const reviewState = pipelineStatus === 'completed' && !pack.degraded ? 'approved' : 'needs_review';
  const clientPayloadAssets = persistedAssets.map((asset) => ({
    kind: asset.kind,
    status: asset.status,
    storage_provider: asset.storage_provider || 'none',
    storage_path: asset.storage_path || '',
    source_url: asset.source_url || '',
  }));

  await Promise.all([
    clientMediaJobsRef(uid).doc(jobId).set(
      {
        job_id: jobId,
        manifest_id: manifestId,
        episode_id: episodeId,
        status: pipelineStatus,
        trigger: 'binge_media_pack',
        runner: 'inline_api',
        generated_at: now,
        updated_at: now,
        narrative: pack.narrative,
        degraded: Boolean(pack.degraded),
        asset_count: persistedAssets.length,
        queued_asset_count: persistedAssets.filter((asset) => asset.status === 'queued').length,
        review_state: reviewState,
        retry_requested_count: 0,
        retry_requested_at: null,
        storage_bucket: storageBucketName || '',
        assets: persistedAssets,
      },
      { merge: true }
    ),
    clientMediaManifestsRef(uid).doc(manifestId).set(
      {
        manifest_id: manifestId,
        job_id: jobId,
        episode_id: episodeId,
        generated_at: now,
        updated_at: now,
        narrative: pack.narrative,
        degraded: Boolean(pack.degraded),
        pipeline_status: pipelineStatus,
        review_state: reviewState,
        direction,
        client_payload: {
          narrative: pack.narrative,
          assets: clientPayloadAssets,
        },
        operator_lineage: {
          trigger: 'binge_media_pack',
          runner: 'inline_api',
          assets: persistedAssets,
          direction,
          generated_at: now,
          updated_at: now,
        },
        assets: persistedAssets,
      },
      { merge: true }
    ),
  ]);

  return {
    job_id: jobId,
    manifest_id: manifestId,
    pipeline_status: pipelineStatus,
    persisted_assets: persistedAssets,
  };
};

const updatePersistedVideoStatus = async ({ uid, jobId, operationName, done, videoUri }) => {
  if (!uid || !jobId) return;
  try {
    const jobRef = clientMediaJobsRef(uid).doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return;
    const jobData = jobSnap.data() ?? {};
    const manifestId = nonEmpty(jobData.manifest_id) || nonEmpty(jobData.episode_id);
    const nextAssets = Array.isArray(jobData.assets)
      ? jobData.assets.map((asset) => {
          if (asset?.kind !== 'video') return asset;
          if (operationName && nonEmpty(asset.video_operation_name) && nonEmpty(asset.video_operation_name) !== operationName) {
            return asset;
          }
          return {
            ...asset,
            status: done && videoUri ? 'generated' : asset.status,
            video_done: done,
            source_url: videoUri || asset.source_url || '',
            storage_provider: videoUri ? 'gemini_uri' : asset.storage_provider || 'none',
          };
        })
      : [];
    const nextStatus = nextAssets.some((asset) => asset?.status === 'queued')
      ? 'queued'
      : nextAssets.some((asset) => asset?.status === 'unavailable')
        ? 'degraded'
        : 'completed';
    const nextReviewState = nextStatus === 'completed' ? 'approved' : 'needs_review';
    const clientPayloadAssets = nextAssets.map((asset) => ({
      kind: asset.kind,
      status: asset.status,
      storage_provider: asset.storage_provider || 'none',
      storage_path: asset.storage_path || '',
      source_url: asset.source_url || '',
    }));

    await jobRef.set(
      {
        status: nextStatus,
        updated_at: new Date(),
        review_state: nextReviewState,
        assets: nextAssets,
      },
      { merge: true }
    );

    if (manifestId) {
      await clientMediaManifestsRef(uid).doc(manifestId).set(
        {
          pipeline_status: nextStatus,
          updated_at: new Date(),
          review_state: nextReviewState,
          client_payload: {
            assets: clientPayloadAssets,
          },
          operator_lineage: {
            assets: nextAssets,
            updated_at: new Date(),
          },
          assets: nextAssets,
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('media_video_status_persist_error', error);
  }
};

const sanitizeMediaLineagePrompt = (value) => nonEmpty(value).slice(0, 220);

const serializeAdminMediaAsset = (asset) => ({
  kind: asset?.kind === 'video' ? 'video' : 'image',
  status: nonEmpty(asset?.status) || 'unknown',
  model: nonEmpty(asset?.model),
  storage_provider: nonEmpty(asset?.storage_provider) || 'none',
  storage_path: nonEmpty(asset?.storage_path) || '',
  source_url: nonEmpty(asset?.source_url) || '',
  note: nonEmpty(asset?.note) || '',
});

const serializeAdminMediaJob = ({ uid, clientData, jobData }) => ({
  client_uid: uid,
  client_name: nonEmpty(clientData?.display_name) || toDisplayName({ email: clientData?.email }) || uid,
  client_email: nonEmpty(clientData?.email),
  job_id: nonEmpty(jobData?.job_id),
  manifest_id: nonEmpty(jobData?.manifest_id),
  episode_id: nonEmpty(jobData?.episode_id),
  status: nonEmpty(jobData?.status) || 'unknown',
  trigger: nonEmpty(jobData?.trigger),
  runner: nonEmpty(jobData?.runner),
  generated_at: toIso(jobData?.generated_at),
  updated_at: toIso(jobData?.updated_at),
  asset_count: Number(jobData?.asset_count || 0),
  queued_asset_count: Number(jobData?.queued_asset_count || 0),
  degraded: Boolean(jobData?.degraded),
  review_state: nonEmpty(jobData?.review_state) || 'needs_review',
  retry_requested_count: Number(jobData?.retry_requested_count || 0),
  retry_requested_at: toIso(jobData?.retry_requested_at),
  assets: Array.isArray(jobData?.assets) ? jobData.assets.map(serializeAdminMediaAsset) : [],
});

const serializeAdminMediaManifest = ({ uid, clientData, manifestData, resolutionSummary }) => {
  const clientPayloadAssets = Array.isArray(manifestData?.client_payload?.assets)
    ? manifestData.client_payload.assets
    : Array.isArray(manifestData?.assets)
      ? manifestData.assets.map((asset) => ({
          kind: asset?.kind === 'video' ? 'video' : 'image',
          status: nonEmpty(asset?.status) || 'unknown',
          storage_provider: nonEmpty(asset?.storage_provider) || 'none',
          storage_path: nonEmpty(asset?.storage_path) || '',
          source_url: nonEmpty(asset?.source_url) || '',
        }))
      : [];
  const lineage = manifestData?.operator_lineage && typeof manifestData.operator_lineage === 'object'
    ? manifestData.operator_lineage
    : {};
  const direction = manifestData?.direction && typeof manifestData.direction === 'object'
    ? manifestData.direction
    : lineage?.direction && typeof lineage.direction === 'object'
      ? lineage.direction
      : {};
  return {
    client_uid: uid,
    client_name: nonEmpty(clientData?.display_name) || toDisplayName({ email: clientData?.email }) || uid,
    client_email: nonEmpty(clientData?.email),
    manifest_id: nonEmpty(manifestData?.manifest_id),
    job_id: nonEmpty(manifestData?.job_id),
    episode_id: nonEmpty(manifestData?.episode_id),
    pipeline_status: nonEmpty(manifestData?.pipeline_status) || 'unknown',
    review_state: nonEmpty(manifestData?.review_state) || 'needs_review',
    generated_at: toIso(manifestData?.generated_at),
    updated_at: toIso(manifestData?.updated_at),
    client_payload_asset_count: clientPayloadAssets.length,
    reusable_gap_count: Number(resolutionSummary?.reusable_gap_count || 0),
    bespoke_gap_count: Number(resolutionSummary?.bespoke_gap_count || 0),
    final_asset_count: Array.isArray(manifestData?.assets) ? manifestData.assets.length : clientPayloadAssets.length,
    image_prompt: sanitizeMediaLineagePrompt(direction?.image_prompt),
    video_prompt: sanitizeMediaLineagePrompt(direction?.video_prompt),
    assets: Array.isArray(manifestData?.assets) ? manifestData.assets.map(serializeAdminMediaAsset) : [],
  };
};

const serializeAdminOrchestrationRun = ({ uid, clientData, runData }) => ({
  client_uid: uid,
  client_name: nonEmpty(clientData?.display_name) || toDisplayName({ email: clientData?.email }) || uid,
  client_email: nonEmpty(clientData?.email),
  run_id: nonEmpty(runData?.run_id),
  started_by_role: nonEmpty(runData?.started_by_role) || nonEmpty(runData?.agent_role),
  trigger: nonEmpty(runData?.trigger),
  status: nonEmpty(runData?.status) || 'unknown',
  intent: nonEmpty(runData?.intent),
  tier: nonEmpty(runData?.tier) || 'unknown',
  summary: nonEmpty(runData?.summary),
  confidence: Number(runData?.confidence || 0),
  approval_state: nonEmpty(runData?.approval_state) || 'not_required',
  next_roles: Array.isArray(runData?.next_roles) ? runData.next_roles.map((entry) => nonEmpty(entry)).filter(Boolean) : [],
  evidence_refs: Array.isArray(runData?.evidence_refs) ? runData.evidence_refs.map((entry) => nonEmpty(entry)).filter(Boolean) : [],
  artifact_refs: Array.isArray(runData?.artifact_refs) ? runData.artifact_refs.map((entry) => nonEmpty(entry)).filter(Boolean) : [],
  updated_at: toIso(runData?.updated_at),
});

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
    const artifacts = withArtifactMeta(buildSuiteFallback(answers), meta);
    let contentDirector = { status: 'skipped' };
    let chiefOfStaff = { status: 'skipped' };
    try {
      chiefOfStaff = await recordChiefOfStaffRun({
        uid,
        intent,
        preferences,
        answers,
        meta,
        artifacts,
        status: 'fallback_completed',
      });
    } catch (orchestrationError) {
      console.error('chief_of_staff_run_error', orchestrationError);
      chiefOfStaff = { status: 'error', detail: sanitizeError(orchestrationError, 'chief_of_staff_run_failed') };
    }
    try {
      contentDirector = await seedContentDirectorPlanning({ uid, intent, preferences, answers, artifacts, meta });
    } catch (planningError) {
      console.error('content_director_seed_error', planningError);
      contentDirector = { status: 'error', detail: sanitizeError(planningError, 'content_director_seed_failed') };
    }
    return res.json({
      meta,
      artifacts,
      orchestration: {
        chief_of_staff: chiefOfStaff,
        content_director: contentDirector,
      },
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
    const responseArtifacts = withArtifactMeta(artifacts, meta);
    let contentDirector = { status: 'skipped' };
    let chiefOfStaff = { status: 'skipped' };
    try {
      chiefOfStaff = await recordChiefOfStaffRun({
        uid,
        intent,
        preferences,
        answers,
        meta,
        artifacts: responseArtifacts,
        status: 'completed',
      });
    } catch (orchestrationError) {
      console.error('chief_of_staff_run_error', orchestrationError);
      chiefOfStaff = { status: 'error', detail: sanitizeError(orchestrationError, 'chief_of_staff_run_failed') };
    }
    try {
      contentDirector = await seedContentDirectorPlanning({
        uid,
        intent,
        preferences,
        answers,
        artifacts: responseArtifacts,
        meta,
      });
    } catch (planningError) {
      console.error('content_director_seed_error', planningError);
      contentDirector = { status: 'error', detail: sanitizeError(planningError, 'content_director_seed_failed') };
    }
    return res.json({
      meta,
      artifacts: responseArtifacts,
      orchestration: {
        chief_of_staff: chiefOfStaff,
        content_director: contentDirector,
      },
    });
  } catch (error) {
    console.error('suite_generation_error', error);
    const meta = baseMeta('fallback', true, {
      reason: String(error?.message ?? 'suite_generation_failed'),
      uid,
      intent,
      preferences,
    });
    const artifacts = withArtifactMeta(buildSuiteFallback(answers), meta);
    let contentDirector = { status: 'skipped' };
    let chiefOfStaff = { status: 'skipped' };
    try {
      chiefOfStaff = await recordChiefOfStaffRun({
        uid,
        intent,
        preferences,
        answers,
        meta,
        artifacts,
        status: 'fallback_completed',
      });
    } catch (orchestrationError) {
      console.error('chief_of_staff_run_error', orchestrationError);
      chiefOfStaff = { status: 'error', detail: sanitizeError(orchestrationError, 'chief_of_staff_run_failed') };
    }
    try {
      contentDirector = await seedContentDirectorPlanning({ uid, intent, preferences, answers, artifacts, meta });
    } catch (planningError) {
      console.error('content_director_seed_error', planningError);
      contentDirector = { status: 'error', detail: sanitizeError(planningError, 'content_director_seed_failed') };
    }
    return res.json({
      meta,
      artifacts,
      orchestration: {
        chief_of_staff: chiefOfStaff,
        content_director: contentDirector,
      },
    });
  }
});

app.get('/v1/media/library', requireAuth, async (req, res) => {
  const runtimeConfig = await loadAppConfig();
  const surfaceCandidate = nonEmpty(req.query?.surface).toLowerCase();
  const surface = JOURNEY_SURFACES.has(surfaceCandidate) ? surfaceCandidate : 'episodes';
  const context = await loadClientJourneyProfile(req.user.uid);
  const episodePlan = await loadContentDirectorEpisodePlan(req.user.uid);
  const isAdmin = isAdminUser(req.user);

  if (!runtimeConfig.media.external_media_enabled) {
    return res.json({
      surface,
      generated_at: new Date().toISOString(),
      context: { ...context, is_admin: isAdmin },
      resolver: isAdmin ? buildLibraryFirstResolution({ items: [], episodePlan: null, surface }) : null,
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
  const resolver = isAdmin ? buildLibraryFirstResolution({ items: visible, episodePlan, surface }) : null;
  if (resolver) {
    await persistLibraryFirstResolution({ uid: req.user.uid, resolution: resolver });
  }

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
    resolver,
    items: visible,
  });
});

app.get('/v1/agents/registry', requireAuth, async (_req, res) => {
  try {
    await ensureGovernanceDocs();
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
  const uid = req.user.uid;
  const runtimeConfig = await loadAppConfig();
  const episodeId = nonEmpty(episode?.episode_id) || `ep-${Date.now().toString(36)}`;
  const direction = buildMediaDirection({
    episode,
    dna,
    targetSkill: target_skill,
    runtimeConfig,
  });
  const withPipelineAssets = (pack, pipeline) => ({
    ...pack,
    ...pipeline,
    assets: Array.isArray(pack.assets)
      ? pack.assets.map((asset, index) => ({
          ...asset,
          ...(Array.isArray(pipeline?.persisted_assets) ? pipeline.persisted_assets[index] ?? {} : {}),
        }))
      : [],
  });

  if (!runtimeConfig.media.enabled) {
    const pack = buildMediaFallbackPack({
      episodeId,
      runtimeConfig,
      direction,
      reason: 'media_module_disabled',
    });
    const pipeline = await persistMediaPipelineArtifacts({ uid, episodeId, direction, pack });
    return res.json(withPipelineAssets(pack, pipeline));
  }

  if (!ai) {
    const pack = buildMediaFallbackPack({
      episodeId,
      runtimeConfig,
      direction,
      reason: 'missing_gemini_api_key',
    });
    const pipeline = await persistMediaPipelineArtifacts({ uid, episodeId, direction, pack });
    return res.json(withPipelineAssets(pack, pipeline));
  }

  try {
    const [imageAsset, videoAsset] = await Promise.all([
      generateImageAsset({ runtimeConfig, direction }),
      generateVideoAsset({ runtimeConfig, direction }),
    ]);

    const pack = {
      episode_id: episodeId,
      narrative: direction.narrative,
      generated_at: new Date().toISOString(),
      degraded: imageAsset.status !== 'generated' || videoAsset.status === 'unavailable',
      assets: [imageAsset, videoAsset],
    };
    const pipeline = await persistMediaPipelineArtifacts({ uid, episodeId, direction, pack });
    return res.json(withPipelineAssets(pack, pipeline));
  } catch (error) {
    console.error('media_pack_error', error);
    const pack = buildMediaFallbackPack({
      episodeId,
      runtimeConfig,
      direction,
      reason: sanitizeError(error, 'media_pack_failed'),
    });
    const pipeline = await persistMediaPipelineArtifacts({ uid, episodeId, direction, pack });
    return res.json(withPipelineAssets(pack, pipeline));
  }
});

app.post('/v1/binge/media-pack/video-status', requireAuth, async (req, res) => {
  const operationName = nonEmpty(req.body?.operation_name);
  const jobId = nonEmpty(req.body?.job_id);
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
    await updatePersistedVideoStatus({
      uid: req.user.uid,
      jobId,
      operationName,
      done: Boolean(operation?.done),
      videoUri: videoUri || '',
    });

    return res.json({
      operation_name: operation?.name || operationName,
      job_id: jobId || null,
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
