import { BriefContent, IntakeAnswers, PlanContent } from '../types';

const nonEmpty = (s: string | undefined | null) => (s ?? '').trim();

export const generateBrief = (answers: IntakeAnswers): BriefContent => {
  const currentTitle = nonEmpty(answers.current_title) || 'your current role';
  const industry = nonEmpty(answers.industry) || 'your industry';
  const target = nonEmpty(answers.target) || 'your next role';

  return {
    learned: [
      `You are reallocating from ${currentTitle} toward ${target}.`,
      `Your market context is ${industry}, and specificity will outperform volume.`,
      'Your edge increases when each action has an explicit decision target.',
    ],
    needle: [
      'Convert experience into proof that survives executive scrutiny.',
      'Protect optionality by concentrating effort on high-leverage moves.',
      'Use AI to structure work, not to manufacture credibility.',
    ],
    next_72_hours: [
      { id: 'n72-1', label: 'Build a verified evidence list: outcomes, scope, and metrics.', done: false },
      { id: 'n72-2', label: 'Define one target lane and remove adjacent noise.', done: false },
      { id: 'n72-3', label: 'Draft a concise positioning statement for stakeholder-facing use.', done: false },
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
  };
};

export const generateProfileDoc = (answers: IntakeAnswers) => {
  const workStyle = nonEmpty(answers.work_style);
  const pressure = nonEmpty(answers.pressure_breaks);

  return {
    strengths: [
      'You favor clear thinking over performative busyness.',
      'You can operate inside constraints without losing quality.',
      'You compound progress through repeatable systems.',
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
  };
};

export const generateAIProfileDoc = (answers: IntakeAnswers) => {
  const industry = nonEmpty(answers.industry) || 'your domain';
  return {
    positioning: `In ${industry}, your advantage is disciplined signal extraction and controlled execution.`,
    how_to_use_ai: [
      'Condense raw notes into decision-grade briefs.',
      'Pressure-test messaging before stakeholder exposure.',
      'Standardize repeatable outputs with verification steps.',
    ],
    guardrails: [
      'No invented credentials or fabricated metrics.',
      'Prefer measured specificity over dramatic language.',
      'When uncertain, state assumptions and ask one clarifying question.',
    ],
  };
};

export const generateGapsDoc = (answers: IntakeAnswers) => {
  const target = nonEmpty(answers.target) || 'your target role';
  const constraints = nonEmpty(answers.constraints);
  return {
    near_term: [
      'Proof points are not yet packaged for executive review.',
      'Positioning lane needs tighter exclusion criteria.',
      'Weekly cadence requires explicit leverage metrics.',
    ],
    for_target_role: [
      `Translate your experience into the operating language of ${target}.`,
      'Add one visible artifact that demonstrates decision quality.',
    ],
    constraints: constraints ? [`Constraint register: ${constraints}.`] : ['Constraint register is incomplete.'],
  };
};
