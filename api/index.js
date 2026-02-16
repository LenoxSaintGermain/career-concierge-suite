import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
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
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};

// NOTE: GFE can intercept /healthz; keep external health on /health.
app.get('/health', (_req, res) => res.status(200).send('OK'));

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || null;
const fastTextModel = process.env.GEMINI_MODEL_FAST || 'gemini-3-flash-preview';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const nonEmpty = (value) => String(value ?? '').trim();

const baseMeta = (mode, degraded, extra = {}) => ({
  prompt_version: ROM_VERSION,
  generation_mode: mode,
  model: mode === 'gemini' ? fastTextModel : 'deterministic-fallback',
  generated_at: new Date().toISOString(),
  degraded,
  ...extra,
});

const buildSuiteFallback = (answers = {}) => {
  const currentTitle = nonEmpty(answers.current_title) || 'your current role';
  const industry = nonEmpty(answers.industry) || 'your industry';
  const target = nonEmpty(answers.target) || 'your next role';
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
      current_role: nonEmpty(answers.current_title),
      target_role: nonEmpty(answers.target),
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

const stubEpisode = (seed = 'default', meta = {}) => {
  const now = Date.now().toString(36).slice(-6);
  return {
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
        { kind: 'video', model: 'veo-3', note: 'If generating a short cinematic clip' },
        { kind: 'image', model: 'nano-banana', note: 'If generating card art / thumbnails' }
      ]
    },
    _meta: meta,
  };
};

app.post('/v1/suite/generate', requireAuth, async (req, res) => {
  const { intent, preferences, answers } = req.body ?? {};

  if (!intent || !preferences || !answers) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const uid = req.user.uid;

  if (!ai) {
    const meta = baseMeta('fallback', true, {
      reason: 'missing_gemini_api_key',
      uid,
      intent,
      preferences,
    });
    return res.json({
      meta,
      artifacts: withArtifactMeta(buildSuiteFallback(answers), meta),
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: fastTextModel,
      contents: composeSuitePrompt({ intent, preferences, answers }),
      config: {
        responseMimeType: 'application/json',
        responseSchema: SUITE_ARTIFACTS_SCHEMA,
        systemInstruction: CONCIERGE_ROM_SYSTEM,
        temperature: 0.45,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('empty_model_response');
    const artifacts = safeParseJson(text);
    const toneViolations = findToneViolations(artifacts);
    if (toneViolations.length) {
      throw new Error(`tone_violation:${toneViolations.join(',')}`);
    }

    const meta = baseMeta('gemini', false, { uid, intent, preferences });
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
  const persistedDna = await loadClientDna(uid);
  const hydratedDna = { ...persistedDna, ...(dna ?? {}) };
  const skill = target_skill || 'prompt architecture under pressure';

  if (!ai) {
    return res.json(
      stubEpisode(
        'noai',
        baseMeta('fallback', true, { reason: 'missing_gemini_api_key', uid, prompt_version: ROM_VERSION })
      )
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: fastTextModel,
      contents: composeBingePrompt({ dna: hydratedDna, targetSkill: skill }),
      config: {
        responseMimeType: 'application/json',
        responseSchema: EPISODE_SCHEMA,
        systemInstruction: composeBingeSystemInstruction(),
        temperature: 0.7
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error('empty_model_response');
    const episode = safeParseJson(text);
    const toneViolations = findToneViolations(episode);
    if (toneViolations.length) {
      throw new Error(`tone_violation:${toneViolations.join(',')}`);
    }

    return res.json({
      ...episode,
      _meta: baseMeta('gemini', false, { uid, target_skill: skill }),
    });
  } catch (e) {
    console.error('binge generation error', e);
    return res.json(
      stubEpisode(
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

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`career-concierge-api listening on :${port}`);
});
