import { Type } from '@google/genai';

export const ROM_VERSION = 'Concierge_ROM_Gemini_v1.0';

export const CONCIERGE_ROM_SYSTEM = `
THIRD SIGNAL - CAREER CONCIERGE ROM
Version: Concierge_ROM_Gemini_v1.0
Environment: Gemini-only
Fork: Signal Atlas UX (repurposed)
Mode: Production

ROLE:
You are the Career Concierge engine inside Third Signal.
You are a strategic positioning system.
You distill signal, sharpen decisions, and ship executive-grade communication artifacts.

TONAL DNA (LOCKED):
- Robert Frost restraint
- Rory Sutherland reframing
- Peter Drucker clarity
- Donna Paulsen authority
- Apple editorial simplicity

Voice attributes:
- Calm
- Intelligent
- Controlled
- Economically literate
- Specific
- Understated but sharp

Never use:
- casual filler
- hype language
- motivational coaching voice
- generic AI phrasing

STRUCTURE RULES:
- Max paragraph length: 4 lines.
- Prefer bullets.
- One idea per sentence.
- Remove unnecessary words before finalizing.
- Use short section headers.

ECONOMIC INTELLIGENCE LAYER:
When relevant, frame decisions using:
- capital allocation of time
- risk insulation
- optionality expansion
- status positioning
- leverage multiplication
`;

const BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    learned: { type: Type.ARRAY, items: { type: Type.STRING } },
    needle: { type: Type.ARRAY, items: { type: Type.STRING } },
    next_72_hours: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          done: { type: Type.BOOLEAN },
        },
        required: ['id', 'label', 'done'],
      },
    },
  },
  required: ['learned', 'needle', 'next_72_hours'],
};

const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    next_72_hours: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          done: { type: Type.BOOLEAN },
        },
        required: ['id', 'label', 'done'],
      },
    },
    next_2_weeks: {
      type: Type.OBJECT,
      properties: {
        goal: { type: Type.STRING },
        cadence: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['goal', 'cadence'],
    },
    needs_from_you: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['next_72_hours', 'next_2_weeks', 'needs_from_you'],
};

const PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
    leverage: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['strengths', 'patterns', 'leverage'],
};

const AI_PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    positioning: { type: Type.STRING },
    how_to_use_ai: { type: Type.ARRAY, items: { type: Type.STRING } },
    guardrails: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['positioning', 'how_to_use_ai', 'guardrails'],
};

const GAPS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    near_term: { type: Type.ARRAY, items: { type: Type.STRING } },
    for_target_role: { type: Type.ARRAY, items: { type: Type.STRING } },
    constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['near_term', 'for_target_role', 'constraints'],
};

export const SUITE_ARTIFACTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    brief: BRIEF_SCHEMA,
    plan: PLAN_SCHEMA,
    profile: PROFILE_SCHEMA,
    ai_profile: AI_PROFILE_SCHEMA,
    gaps: GAPS_SCHEMA,
  },
  required: ['brief', 'plan', 'profile', 'ai_profile', 'gaps'],
};

export const EPISODE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    episode_id: { type: Type.STRING },
    title: { type: Type.STRING, description: 'Punchy episode title (max 8 words)' },
    hook_card: { type: Type.STRING, description: 'Cold open micro-drama hook (2-5 sentences)' },
    lesson_swipes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 short swipe cards; each 1-2 sentences.',
    },
    challenge_terminal: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The user challenge prompt' },
        placeholder: { type: Type.STRING, description: 'Placeholder text for the input terminal' },
      },
      required: ['prompt', 'placeholder'],
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
              model: {
                type: Type.STRING,
                description: 'e.g., gemini-3-flash-preview, gemini-2.5-flash-image-preview, veo-3.1-generate-preview',
              },
              note: { type: Type.STRING },
            },
            required: ['kind', 'model'],
          },
        },
      },
    },
  },
  required: ['episode_id', 'title', 'hook_card', 'lesson_swipes', 'challenge_terminal', 'reward_asset', 'cliffhanger'],
};

const renderAnswers = (answers = {}) => {
  const entries = Object.entries(answers).filter(([, value]) => String(value ?? '').trim());
  if (!entries.length) return '- none provided';
  return entries.map(([key, value]) => `- ${key}: ${String(value).trim()}`).join('\n');
};

export const composeSuitePrompt = ({ intent, preferences, answers }) => `
Generate a Career Concierge suite in strict JSON with keys:
- brief
- plan
- profile
- ai_profile
- gaps

Client context:
- intent: ${intent}
- pace: ${preferences?.pace ?? 'standard'}
- focus: ${preferences?.focus ?? 'job_search'}

Intake answers:
${renderAnswers(answers)}

Output contract:
- Keep tone stable with the ROM.
- Keep language executive and restrained.
- Avoid hype and motivational language.
- Include economic framing where useful.
- Produce concise bullets and short sentences.
- Populate all required fields from the response schema.
`;

export const composeBingeSystemInstruction = () => `
${CONCIERGE_ROM_SYSTEM}

ADDITIONAL MODE: B.I.N.G.E_LEARNING_PROTOCOL
You are the Executive Showrunner for a premium binge-learning experience.
Rules:
1. No academic language (no module, syllabus, test, quiz).
2. Hyper-personalize to the user's role and context.
3. Start with urgency (time, pressure, or threat).
4. Frame the skill as an executable weapon.
5. Force action via challenge terminal.
6. End with a cliffhanger and "Swipe Up".
`;

export const composeBingePrompt = ({ dna, targetSkill }) => `
Generate one B.I.N.G.E episode in strict JSON.

User DNA:
- Current Role: ${dna?.current_role ?? 'your current role'}
- Target Role: ${dna?.target_role ?? 'your next role'}
- Industry: ${dna?.industry ?? 'your industry'}
- Constraints: ${dna?.constraints ?? 'not specified'}
- Work Style: ${dna?.work_style ?? 'not specified'}
- Pressure Pattern: ${dna?.pressure_breaks ?? 'not specified'}

Target Skill: ${targetSkill || 'prompt architecture under pressure'}

Requirements:
- 3 lesson swipes only.
- Keep language sharp and controlled.
- Keep tone premium and restrained, even in high-stakes scenarios.
- Provide art_direction prompts that can drive one still image and one cinematic short.
`;

const TONE_GUARD = [
  { code: 'hype', re: /\b(crush it|dominate|game[- ]?changer|10x|rocketship)\b/i },
  { code: 'startup-slang', re: /\b(rockstar|ninja|guru)\b/i },
  { code: 'motivation', re: /\b(you got this|dream big|stay motivated|manifest)\b/i },
  { code: 'casual', re: /\b(lol|omg|kinda|super easy)\b/i },
  { code: 'excess-punctuation', re: /!{2,}/ },
];

const collectStrings = (value, out = []) => {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
};

export const findToneViolations = (payload) => {
  const matches = new Set();
  const strings = collectStrings(payload);

  for (const text of strings) {
    for (const guard of TONE_GUARD) {
      if (guard.re.test(text)) matches.add(guard.code);
    }
    if (text.split('\n').length > 4) matches.add('long-paragraph');
  }

  return [...matches];
};
