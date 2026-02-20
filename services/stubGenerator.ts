import {
  BriefContent,
  CjsExecutionContent,
  IntakeAnswers,
  PlanContent,
  ReadinessContent,
  SuiteDistilledContent,
} from '../types';

const nonEmpty = (s: unknown) => String(s ?? '').trim();
const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
const resolveCurrentTitle = (answers: IntakeAnswers) =>
  nonEmpty(answers.current_title || answers.current_or_target_job_title) || 'your current role';
const resolveTargetRole = (answers: IntakeAnswers) =>
  nonEmpty(answers.target || answers.current_or_target_job_title) || 'your next role';
const resolveIndustry = (answers: IntakeAnswers) => nonEmpty(answers.industry) || 'your industry';

export const generateBrief = (answers: IntakeAnswers): BriefContent => {
  const currentTitle = resolveCurrentTitle(answers);
  const industry = resolveIndustry(answers);
  const target = resolveTargetRole(answers);

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
  const target = resolveTargetRole(answers);

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
  const industry = resolveIndustry(answers);
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
  const target = resolveTargetRole(answers);
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

export const generateSuiteDistilledDoc = (
  brief: BriefContent,
  answers: IntakeAnswers
): SuiteDistilledContent => {
  const target = resolveTargetRole(answers);
  return {
    what_i_learned: brief.learned,
    what_needs_to_happen: [
      `Package your profile for ${target} in language the hiring panel already trusts.`,
      'Convert noisy activity into a tight leverage sequence.',
      'Run one high-signal outreach cycle per week with explicit asks.',
    ],
    next_to_do: brief.next_72_hours,
  };
};

export const generateReadinessDoc = (answers: IntakeAnswers): ReadinessContent => {
  const usage = nonEmpty(answers.ai_usage_frequency).toLowerCase();
  const advanced = asList(answers.advanced_interests);
  const foundational = asList(answers.foundational_interests);
  const target = resolveTargetRole(answers);
  const industry = resolveIndustry(answers);

  let tier: ReadinessContent['tier_recommendation'] = 'Foundation';
  if (usage === 'daily' || advanced.length >= 3) tier = 'Premier';
  else if (usage === 'regularly' || advanced.length >= 1 || foundational.length >= 3) tier = 'Select';

  return {
    tier_recommendation: tier,
    executive_overview: [
      `Readiness is calibrated for ${target} in ${industry}.`,
      `Current usage signal indicates ${usage || 'early-stage'} AI operational maturity.`,
      `Recommended tier: ${tier}.`,
    ],
    from_awareness_to_action: [
      'Shift from ad-hoc prompting to repeatable operating patterns.',
      'Map each AI output to a business decision or measurable outcome.',
      'Instrument one workflow for weekly review and iteration.',
    ],
    targeted_ai_development_priorities: [
      'Strengthen role-specific prompt architecture for decision support.',
      'Increase stakeholder-ready communication quality and traceability.',
      'Build reusable assets that compound across job search and execution.',
    ],
    technical_development_areas: [
      'Prompt system design with guardrails and context windows.',
      'Workflow automation fundamentals and integration hygiene.',
      'Multimodal communication assembly for executive narratives.',
    ],
  };
};

export const generateCjsExecutionDoc = (answers: IntakeAnswers): CjsExecutionContent => {
  const target = resolveTargetRole(answers);
  const constraints = nonEmpty(answers.constraints);
  const blocked = constraints ? 'blocked' : 'planned';

  return {
    intent_summary: `ConciergeJobSearch execution launched toward ${target}.`,
    stages: [
      { step: 1, title: 'Smart Start Intake', status: 'ready', description: 'Foundation event captured and mapped into Professional DNA.' },
      { step: 2, title: 'AI Insights Report', status: 'ready', description: 'Readiness and market context synthesized into execution guidance.' },
      { step: 3, title: 'Resume Optimization', status: 'planned', description: 'Resume reframed against target role language and keyword strategy.' },
      { step: 4, title: 'Search Strategy', status: 'planned', description: 'Target account list and outreach vectors prioritized by signal score.' },
      { step: 5, title: 'Search & Apply', status: blocked, description: constraints ? `Waiting on constraints: ${constraints}` : 'Application execution queue prepared.' },
      { step: 6, title: 'Employer Insight Reports', status: 'planned', description: 'Company intelligence briefs for interviews and negotiation leverage.' },
      { step: 7, title: 'Interview Preparation', status: 'planned', description: 'Narrative frameworks and response structures tailored to role.' },
      { step: 8, title: 'Salary Negotiation', status: 'planned', description: 'Compensation framing and script set calibrated to market data.' },
      { step: 9, title: 'Dispute to Counter', status: 'planned', description: 'Post-offer counter strategy with data-backed decision logic.' },
    ],
  };
};
