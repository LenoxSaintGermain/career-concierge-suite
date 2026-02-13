import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: true }));

// Firebase Admin uses Application Default Credentials in Cloud Run.
if (!admin.apps.length) {
  admin.initializeApp();
}

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

const BINGE_SYSTEM = `
[SYSTEM: B.I.N.G.E_LEARNING_PROTOCOL]
You are the Executive Showrunner for a premium binge-learning platform.
Your directive is to convert educational theory into high-stakes, addictive Micro-Dramas.

RULES OF ENGAGEMENT:
1. NO ACADEMIC LANGUAGE. Do not use words like "module, syllabus, test, or quiz."
2. HYPER-PERSONALIZATION. Make the user the protagonist of a corporate thriller matching their exact Target Role.
3. THE HOOK. Start every scenario with a time limit, an angry boss, or a massive threat.
4. THE DELIVERY. Frame the educational concept NOT as a theory, but as the "weapon" required to survive the scenario.
5. THE OUTCOME. Present a broken situation and force the user to execute the right prompt to fix it.
6. THE CLIFFHANGER. Solve the immediate crisis, then reveal a bigger challenge. End with "Swipe Up".

OUTPUT: JSON payload with keys:
episode_id, title, hook_card, lesson_swipes, challenge_terminal, reward_asset, cliffhanger, art_direction
`;

const EPISODE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    episode_id: { type: Type.STRING },
    title: { type: Type.STRING, description: 'Punchy episode title (max 8 words)' },
    hook_card: { type: Type.STRING, description: 'Cold open micro-drama hook (2-5 sentences)' },
    lesson_swipes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 short swipe cards; each 1-2 sentences.'
    },
    challenge_terminal: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The user challenge prompt' },
        placeholder: { type: Type.STRING, description: 'Placeholder text for the input terminal' }
      },
      required: ['prompt', 'placeholder']
    },
    reward_asset: { type: Type.STRING, description: 'Unlocked asset / blueprint text' },
    cliffhanger: { type: Type.STRING, description: 'Ends with a threat + Swipe Up instruction' },
    art_direction: {
      type: Type.OBJECT,
      properties: {
        image_prompt: { type: Type.STRING },
        video_prompt: { type: Type.STRING },
        audio_prompt: { type: Type.STRING },
        recommended_models: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kind: { type: Type.STRING, description: 'text|image|video|audio' },
              model: { type: Type.STRING, description: 'e.g., gemini-3-flash, veo-3, nano-banana' },
              note: { type: Type.STRING }
            },
            required: ['kind', 'model']
          }
        }
      }
    }
  },
  required: ['episode_id', 'title', 'hook_card', 'lesson_swipes', 'challenge_terminal', 'reward_asset', 'cliffhanger']
};

const stubEpisode = (seed = 'default') => {
  const now = Date.now().toString(36).slice(-6);
  return {
    episode_id: `ep-${seed}-${now}`,
    title: 'The 4:42 PM Friday',
    hook_card:
      'It’s 4:42 PM on a Friday. Your exec just dropped an urgent request: “I need a clean board-ready brief in 18 minutes.”\nYou have exactly one shot. Your old self would panic. Your new self uses AI.',
    lesson_swipes: [
      'Doing this manually takes 90 minutes. You will miss the deadline.',
      'A naive chatbot will invent details. You will look careless.',
      'You need an Executive Extraction prompt: inputs, constraints, output format.'
    ],
    challenge_terminal: {
      prompt: 'Build the prompt that extracts facts, flags unknowns, and outputs a one-page brief.',
      placeholder: 'Paste your prompt framework here…'
    },
    reward_asset: 'UNLOCKED: “Executive Extraction” prompt blueprint added to your vault.',
    cliffhanger:
      'You delivered. The exec forwarded it to the board.\nNow they want you to present the logic behind it on Monday.\nSwipe Up to initiate Episode 2.',
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
    }
  };
};

// Phase 0 endpoint: server-side “stub” artifact generation.
// Phase 1: swap this with @google/genai + JSON schema generation.
app.post('/v1/suite/generate', requireAuth, async (req, res) => {
  const { intent, preferences, answers } = req.body ?? {};

  if (!intent || !preferences || !answers) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const currentTitle = String(answers.current_title ?? '').trim() || 'your current role';
  const industry = String(answers.industry ?? '').trim() || 'your industry';
  const target = String(answers.target ?? '').trim() || 'your next role';

  const brief = {
    learned: [
      `You’re operating from ${currentTitle} with real constraints, not hypotheticals.`,
      `You’re targeting ${target} and want a plan that is practical inside ${industry}.`,
      `You respond best when the next action is obvious and timeboxed.`,
    ],
    needle: [
      'Reduce decision friction by standardizing how you gather context and take action.',
      'Build outward credibility signals that match the role you want, not just the role you have.',
      'Use AI for structure and iteration, not for pretending experience you do not have.',
    ],
    next_72_hours: [
      { id: 'n72-1', label: 'Upload your current resume (or paste it) so we can lock facts.', done: false },
      { id: 'n72-2', label: 'Pick 3 target companies or teams; we will shape a focused sprint.', done: false },
      { id: 'n72-3', label: 'Draft a 5-sentence “what I do / what I’m aiming at” statement.', done: false },
    ],
  };

  const plan = {
    next_72_hours: [
      { id: 'p72-1', label: 'Confirm your constraints (location, time, salary floor).', done: false },
      { id: 'p72-2', label: 'Create a one-page “evidence inventory” (projects, wins, metrics).', done: false },
      { id: 'p72-3', label: `Choose 1 role story: why ${target} makes sense for you now.`, done: false },
    ],
    next_2_weeks: {
      goal: 'Move from “application mode” to “positioning mode.”',
      cadence: [
        '2 focused outreach messages per week (not spam).',
        '1 credibility signal per week (post, note, portfolio snippet).',
        '1 interview-prep block per week (stories + scenarios).',
      ],
    },
    needs_from_you: [
      'Your resume (or LinkedIn export).',
      'A short list of roles/companies that feel real to you (even if imperfect).',
    ],
  };

  const profile = {
    strengths: ['You value clarity over noise.', 'You want momentum without chaos.', 'You’re willing to iterate if the direction is coherent.'],
    patterns: [
      answers.pressure_breaks ? `Under pressure, ${String(answers.pressure_breaks).toLowerCase()} is your first failure point.` : 'Under pressure, your first failure point is predictable.',
      answers.work_style ? `You regain control through: ${String(answers.work_style).toLowerCase()}.` : 'You regain control through a clear next action.',
    ],
    leverage: [
      'Turn “busy work” into reusable operating procedures.',
      'Package your wins into short, repeatable stories.',
      'Use AI to draft structure; you supply the truth and the judgment.',
    ],
  };

  const ai_profile = {
    positioning: `In ${industry}, your advantage is speed-to-clarity: turning messy inputs into clean decisions.`,
    how_to_use_ai: [
      'Context gathering: summarize emails/notes into a crisp brief.',
      'Structure: turn chaos into an outline, a plan, or a script.',
      'Iteration: refine deliverables fast while preserving factual accuracy.',
    ],
    guardrails: ['No invented credentials or fabricated metrics.', 'Prefer short, verifiable claims over “impressive” claims.', 'When uncertain: flag, ask, confirm.'],
  };

  const gaps = {
    near_term: [
      'A clean inventory of evidence (projects, outcomes, metrics).',
      'A tighter role narrative: why you, why now.',
      'A realistic weekly cadence that does not collapse.',
    ],
    for_target_role: [
      `Translate your experience into the language of ${target}.`,
      'Add 1-2 visible proof points (portfolio, post, short case).',
    ],
    constraints: answers.constraints ? [`Constraints noted: ${String(answers.constraints)}.`] : ['Constraints not yet captured.'],
  };

  return res.json({
    meta: { intent, preferences, uid: req.user.uid },
    artifacts: {
      brief,
      plan,
      profile,
      ai_profile,
      gaps,
    },
  });
});

// B.I.N.G.E: Generate one episode (fast).
app.post('/v1/binge/episode', requireAuth, async (req, res) => {
  const { dna, target_skill } = req.body ?? {};

  // Minimal input: we can generate without full DNA; if provided, bind it.
  const role = dna?.current_role || 'your current role';
  const target = dna?.target_role || 'your next role';
  const industry = dna?.industry || 'your industry';
  const skill = target_skill || 'prompt architecture under pressure';

  if (!ai) {
    return res.json(stubEpisode('noai'));
  }

  const prompt = `
User DNA:
- Current Role: ${role}
- Target Role: ${target}
- Industry: ${industry}

Target Skill: ${skill}

Remember: start with a time limit and an urgent boss message. 3 swipe cards max. Keep it tight.
`;

  try {
    const response = await ai.models.generateContent({
      model: fastTextModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: EPISODE_SCHEMA,
        systemInstruction: BINGE_SYSTEM,
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) return res.json(stubEpisode('empty'));
    return res.json(JSON.parse(text));
  } catch (e) {
    console.error('binge generation error', e);
    return res.json(stubEpisode('err'));
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`career-concierge-api listening on :${port}`);
});
