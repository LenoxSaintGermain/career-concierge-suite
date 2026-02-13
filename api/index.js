import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

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

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`career-concierge-api listening on :${port}`);
});
