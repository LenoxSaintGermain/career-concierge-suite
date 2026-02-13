import { BriefContent, IntakeAnswers, PlanContent } from '../types';

const nonEmpty = (s: string | undefined | null) => (s ?? '').trim();

export const generateBrief = (answers: IntakeAnswers): BriefContent => {
  const currentTitle = nonEmpty(answers.current_title) || 'your current role';
  const industry = nonEmpty(answers.industry) || 'your industry';
  const target = nonEmpty(answers.target) || 'your next role';

  return {
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
};

export const generatePlan = (answers: IntakeAnswers): PlanContent => {
  const target = nonEmpty(answers.target) || 'your next role';

  const next72 = [
    { id: 'p72-1', label: 'Confirm your constraints (location, time, salary floor).', done: false },
    { id: 'p72-2', label: 'Create a one-page “evidence inventory” (projects, wins, metrics).', done: false },
    { id: 'p72-3', label: `Choose 1 role story: why ${target} makes sense for you now.`, done: false },
  ];

  return {
    next_72_hours: next72,
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
};

export const generateProfileDoc = (answers: IntakeAnswers) => {
  const workStyle = nonEmpty(answers.work_style);
  const pressure = nonEmpty(answers.pressure_breaks);

  return {
    strengths: [
      'You value clarity over noise.',
      'You want momentum without chaos.',
      'You’re willing to iterate if the direction is coherent.',
    ],
    patterns: [
      pressure ? `Under pressure, ${pressure.toLowerCase()} is your first failure point.` : 'Under pressure, your first failure point is predictable.',
      workStyle ? `You regain control through: ${workStyle.toLowerCase()}.` : 'You regain control through a clear next action.',
    ],
    leverage: [
      'Turn “busy work” into reusable operating procedures.',
      'Package your wins into short, repeatable stories.',
      'Use AI to draft structure; you supply the truth and the judgment.',
    ],
  };
};

export const generateAIProfileDoc = (answers: IntakeAnswers) => {
  const industry = nonEmpty(answers.industry) || 'your domain';
  return {
    positioning: `In ${industry}, your advantage is speed-to-clarity: turning messy inputs into clean decisions.`,
    how_to_use_ai: [
      'Context gathering: summarize emails/notes into a crisp brief.',
      'Structure: turn chaos into an outline, a plan, or a script.',
      'Iteration: refine deliverables fast while preserving factual accuracy.',
    ],
    guardrails: [
      'No invented credentials or fabricated metrics.',
      'Prefer short, verifiable claims over “impressive” claims.',
      'When uncertain: flag, ask, confirm.',
    ],
  };
};

export const generateGapsDoc = (answers: IntakeAnswers) => {
  const target = nonEmpty(answers.target) || 'your target role';
  const constraints = nonEmpty(answers.constraints);
  return {
    near_term: [
      'A clean inventory of evidence (projects, outcomes, metrics).',
      'A tighter role narrative: why you, why now.',
      'A realistic weekly cadence that does not collapse.',
    ],
    for_target_role: [
      `Translate your experience into the language of ${target}.`,
      'Add 1-2 visible proof points (portfolio, post, short case).',
    ],
    constraints: constraints ? [`Constraints noted: ${constraints}.`] : ['Constraints not yet captured.'],
  };
};

