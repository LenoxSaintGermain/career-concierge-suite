import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Modality } from '@google/genai';
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

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: true }));

// Firebase Admin uses Application Default Credentials in Cloud Run.
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'career-concierge';
const db = getFirestore(admin.app(), firestoreDatabaseId);

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
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const liveTokenAi = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { apiVersion: 'v1alpha' } })
  : null;

const nonEmpty = (value) => String(value ?? '').trim();
const adminEmailSet = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
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

const normalizeConfig = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const generation = source.generation && typeof source.generation === 'object' ? source.generation : {};
  const prompts = source.prompts && typeof source.prompts === 'object' ? source.prompts : {};
  const ui = source.ui && typeof source.ui === 'object' ? source.ui : {};
  const operations = source.operations && typeof source.operations === 'object' ? source.operations : {};
  const media = source.media && typeof source.media === 'object' ? source.media : {};
  const voice = source.voice && typeof source.voice === 'object' ? source.voice : {};
  const safety = source.safety && typeof source.safety === 'object' ? source.safety : {};

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

const liveSystemInstruction = (runtimeConfig) =>
  joinInstructionParts(
    CONCIERGE_ROM_SYSTEM,
    runtimeConfig?.prompts?.rom_appendix,
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
    };
  } catch (error) {
    console.error('dna_load_error', error);
    return {};
  }
};

const defaultArtPrompts = {
  image:
    'A premium editorial still: high-stakes desk scene, minimal interface glow, restrained teal accent, poised subject, quiet urgency.',
  video:
    'An 8-second cinematic cold-open: executive notification, countdown tension, strategic pause, controlled camera push, elegant teal accents.',
  audio:
    'Subtle atmospheric underscore: low pulse, soft ticking motif, restrained tension, premium finish.',
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

const synthesizeWithGeminiLive = async ({ runtimeConfig, text }) => {
  if (!ai) {
    throw new Error('missing_gemini_api_key');
  }

  const timeoutMs = Number(process.env.GEMINI_LIVE_TIMEOUT_MS || 30000);
  const model = nonEmpty(runtimeConfig.voice.gemini_live_model) || geminiLiveModelDefault;
  const voiceName = nonEmpty(runtimeConfig.voice.gemini_voice_name) || nonEmpty(runtimeConfig.voice.speaker) || 'Aoede';
  const instruction = liveSystemInstruction(runtimeConfig);

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
            responseModalities: [Modality.AUDIO, Modality.TEXT],
            systemInstruction: liveSystemInstruction(runtimeConfig),
            temperature: runtimeConfig.voice.temperature,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
            mediaResolution: 'MEDIA_RESOLUTION_LOW',
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
        ? await synthesizeWithGeminiLive({ runtimeConfig, text })
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
  const skill = target_skill || 'prompt architecture under pressure';

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
