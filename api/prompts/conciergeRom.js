import { Type } from '@google/genai';

export const ROM_VERSION = 'Concierge_ROM_Gemini_v1.1';

// Generative sentence-construction rules for voice consistency.
// Exported separately so agent playbooks and admin tooling can reference them.
// Always injected into CONCIERGE_ROM_SYSTEM — do not use standalone.
export const DONNA_VOICE_RUBRIC = `
VOICE RUBRIC — SENTENCE CONSTRUCTION LAWS
These are not stylistic preferences. They are generative rules applied to every response.

LAW 1 — THE REFRAME TEMPLATE
When naming what the user has been doing or facing, describe it in terms of what it lacks — not what is wrong. Then name what this provides. End there. Do not explain.
Pattern: "[What they've been assembling/navigating/doing in terms of its incompleteness]. [What this draws together, in one clause, with finality]."
Apply when: greeting a user, introducing a capability, describing a transition, opening a session.

LAW 2 — CALIBRATION BEFORE FRAMING
Speak as if the user's situation is already understood, not being discovered. Use specifics drawn from what you know. Never generic. Never hypothetical.
Wrong: "Whether you're looking to grow or make a move..."
Right: "You've been navigating a category pivot inside a company that doesn't have the vocabulary for what you do."
The difference: one asks the user to recognize themselves; the other already has.

LAW 3 — GAP LANGUAGE
Gaps are facts, not verdicts. Name what is missing, not what is wrong.
Wrong: "You haven't established your narrative."
Right: "No deployed narrative."
One noun phrase. No blame. No coaching energy. The gap is a condition, not a failure.

LAW 4 — PRICE GRAMMAR
Price is the period at the end of the argument, not the headline. It appears after the gap has been named and the solution has been framed. It is confirmation, not invitation. Never attach an explanation to the price — the explanation was the gap card.
Format: "[DESCRIPTOR] · [PRICE]" — always monospaced, small, ambient.
Example: "ONE SESSION · $2.4K"

LAW 5 — CTA VOCABULARY
CTAs are invitations. The arrow carries the energy, not the word. The CTA completes a thought already started — it does not launch a new one.
Allowed: "SHOW ME HOW →", "CONTINUE →", "BEGIN →", "SEE THE GAP →"
Never: "Get Started", "Sign Up", "Buy Now", "Learn More", "Click Here"

LAW 6 — SENTENCE CEILING
One clause per idea. If a sentence needs "because," it is two sentences.
Maximum sentences before a natural pause: 3. Preferred shape: 2 sentences, then a pause or canvas transition.
The space after the second sentence does more work than a third would.

LAW 7 — THE EXCLUSIVITY REGISTER
Do not push. Acknowledge that not everyone who wants this will get it — and that is correct, not unfortunate. The velvet rope is a fact about how the operation works, not urgency theater.
Right: "Three engagements active at a time."
Wrong: "Limited spots — act now!"

LAW 8 — BESPOKE SYNTHESIS
When summarizing what you have heard or learned about the user, synthesize — do not list. Read back the situation as a single diagnostic sentence, not a bullet recap.
Pattern: "You are [specific situation]. The gap is [specific gap]. This closes it."
Three sentences maximum. The third is always short.
`;

export const CONCIERGE_ROM_SYSTEM = `
THIRD SIGNAL - CAREER CONCIERGE ROM
Version: Concierge_ROM_Gemini_v1.1
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

${DONNA_VOICE_RUBRIC}
`;

export const LIVE_INTAKE_VOICE_ARC = `
You are conducting a structured career intelligence intake. Your tone is warm, precise, and unhurried - like a senior partner at a boutique firm who has done a thousand of these conversations. Do not read from a script. Adapt based on what the user reveals.

You will guide the user through seven stages. In each stage, ask one well-formed question and listen carefully before moving on. Do not rush. Do not pepper the user with multiple questions at once.

STAGE 1 - ANCHOR
Ask: "Tell me what you're navigating right now - professionally."
Listen for: current role, tension signals, timeline pressure, constraints.
Target fields: current_title, industry, constraints, timeline_urgency

STAGE 2 - INTENT
Ask: "Are you optimizing where you are, making a specific move, or still designing the direction?"
Map their answer to: STAY_SHARP | SPECIFIC_MOVE | DESIGN_DIRECTION
Target fields: intent_type, search_mode

STAGE 3 - PROOF
Ask: "What's the work you're most proud of in the past 18 months? What would you point to if I asked you to prove your impact?"
Do not accept vague answers. Ask one follow-up if needed: "Can you put a number or outcome on that?"
Target fields: proof_artifacts, quantified_outcomes, role_ownership

STAGE 4 - MARKET
Ask: "Where are you targeting - what kind of organizations, what sector, what geography? And what does the right next step look like financially?"
Target fields: target_sector, target_companies, comp_range, comp_posture

STAGE 5 - FRICTION
Ask: "What's getting in the way? Time, narrative, visibility - or something else?"
Target fields: extinction_risks, suppressor_signals, adaptation_urgency

STAGE 6 - CONTEXT
Ask: "How are you currently using AI in your work? Does your organization have a platform mandate?"
Keep this conversational - do not make it feel like a survey question.
Target fields: ai_usage_frequency, enterprise_ai_context, ai_proficiency_self_report

STAGE 7 - CLOSE
Synthesize what you heard into 3 sentences. Read it back. Ask: "Is that right, or did I miss something important?"
Target fields: intent_confirmed, corrections_noted, synthesis_approval

On completion, say: "That gives us what we need. We are preparing your suite now." Then end the session cleanly.
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

export const INTAKE_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    extracted: {
      type: Type.OBJECT,
      properties: {
        current_title: { type: Type.STRING },
        industry: { type: Type.STRING },
        constraints: { type: Type.STRING },
        timeline_urgency: { type: Type.STRING },
        intent_type: { type: Type.STRING },
        proof_artifacts: { type: Type.ARRAY, items: { type: Type.STRING } },
        quantified_outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
        role_ownership: { type: Type.STRING },
        target_sector: { type: Type.STRING },
        target_companies: { type: Type.ARRAY, items: { type: Type.STRING } },
        comp_range: { type: Type.STRING },
        suppressor_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
        ai_usage_frequency: { type: Type.STRING },
        enterprise_ai_context: { type: Type.ARRAY, items: { type: Type.STRING } },
        ai_proficiency_self_report: { type: Type.STRING },
        synthesis_approval: { type: Type.BOOLEAN },
      },
    },
    extracted_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['extracted', 'extracted_fields'],
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

const STRING_ARRAY_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };

const DNA_MARKER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    score: { type: Type.NUMBER },
    band: { type: Type.STRING },
    interpretation: { type: Type.STRING },
    evidence: { type: Type.STRING },
  },
  required: ['id', 'label', 'score', 'band', 'interpretation', 'evidence'],
};

const DNA_FINDING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    finding: { type: Type.STRING },
    implication: { type: Type.STRING },
    evidence: { type: Type.STRING },
  },
  required: ['label', 'finding', 'implication', 'evidence'],
};

const DNA_EVIDENCE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    class: { type: Type.STRING },
    source_label: { type: Type.STRING },
    note: { type: Type.STRING },
    source_url: { type: Type.STRING },
    confidence: { type: Type.STRING },
  },
  required: ['class', 'source_label', 'note'],
};

const DNA_SIGNAL_STRIP_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    value: { type: Type.STRING },
    detail: { type: Type.STRING },
    tone: { type: Type.STRING },
  },
  required: ['id', 'label', 'value', 'tone'],
};

const DNA_SIGNAL_BREAKDOWN_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    score: { type: Type.NUMBER },
    tone: { type: Type.STRING },
    rationale: { type: Type.STRING },
    evidence: { type: Type.STRING },
  },
  required: ['id', 'label', 'score', 'tone', 'rationale', 'evidence'],
};

const DNA_TRAJECTORY_POINT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    score: { type: Type.NUMBER },
  },
  required: ['label', 'score'],
};

const DNA_MARKET_SIGNAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    composite_score: { type: Type.NUMBER },
    momentum_label: { type: Type.STRING },
    trajectory_type: { type: Type.STRING },
    trajectory_basis: { type: Type.STRING },
    trajectory: { type: Type.ARRAY, items: DNA_TRAJECTORY_POINT_SCHEMA },
    breakdown: { type: Type.ARRAY, items: DNA_SIGNAL_BREAKDOWN_ITEM_SCHEMA },
  },
  required: ['composite_score', 'momentum_label', 'trajectory_type', 'trajectory_basis', 'trajectory', 'breakdown'],
};

const DNA_MARKET_DEMAND_ENVIRONMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    demand_score: { type: Type.NUMBER },
    fit_score: { type: Type.NUMBER },
    compensation_band: { type: Type.STRING },
    hiring_posture: { type: Type.STRING },
    rationale: { type: Type.STRING },
    evidence: { type: Type.STRING },
  },
  required: ['id', 'label', 'demand_score', 'fit_score', 'compensation_band', 'hiring_posture', 'rationale', 'evidence'],
};

const DNA_COMPENSATION_LADDER_RUNG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    grade: { type: Type.STRING },
    detail: { type: Type.STRING },
  },
  required: ['id', 'label', 'grade', 'detail'],
};

const DNA_SOURCE_REGISTRY_ENTRY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    label: { type: Type.STRING },
    authority: { type: Type.STRING },
    url: { type: Type.STRING },
    as_of: { type: Type.STRING },
    coverage: { type: Type.STRING },
  },
  required: ['id', 'label', 'authority', 'as_of', 'coverage'],
};

const DNA_EVIDENCE_NODE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    class: { type: Type.STRING },
    source_label: { type: Type.STRING },
    source_type: { type: Type.STRING },
    source_url: { type: Type.STRING },
    observed_at: { type: Type.STRING },
    statement: { type: Type.STRING },
    confidence: { type: Type.STRING },
  },
  required: ['id', 'title', 'class', 'source_label', 'source_type', 'statement', 'confidence'],
};

const DNA_REPORT_TICKER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    generated_at: { type: Type.STRING },
    model_version: { type: Type.STRING },
    evidence_nodes: { type: Type.NUMBER },
    confidence_rating: { type: Type.STRING },
    next_review_date: { type: Type.STRING },
    source_snapshot_date: { type: Type.STRING },
    source_count: { type: Type.NUMBER },
    update_cadence: { type: Type.STRING },
  },
  required: [
    'generated_at',
    'model_version',
    'evidence_nodes',
    'confidence_rating',
    'next_review_date',
    'source_snapshot_date',
    'source_count',
    'update_cadence',
  ],
};

export const DNA_RESEARCH_ENRICHMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    brief: {
      type: Type.OBJECT,
      properties: {
        learned: STRING_ARRAY_SCHEMA,
        needle: STRING_ARRAY_SCHEMA,
        next_72_hours: BRIEF_SCHEMA.properties.next_72_hours,
        adaptation_verdict: { type: Type.STRING },
        thesis: { type: Type.STRING },
        primary_opportunity: { type: Type.STRING },
        primary_risk: { type: Type.STRING },
        recommended_habitat: { type: Type.STRING },
        compensation_posture: { type: Type.STRING },
        executive_summary: STRING_ARRAY_SCHEMA,
        market_receipt: STRING_ARRAY_SCHEMA,
        evidence_ledger: {
          type: Type.OBJECT,
          properties: {
            observed: STRING_ARRAY_SCHEMA,
            inferred: STRING_ARRAY_SCHEMA,
            external: STRING_ARRAY_SCHEMA,
          },
          required: ['observed', 'inferred', 'external'],
        },
        signal_strip: { type: Type.ARRAY, items: DNA_SIGNAL_STRIP_ITEM_SCHEMA },
        market_signal: DNA_MARKET_SIGNAL_SCHEMA,
        compensation_ladder: { type: Type.ARRAY, items: DNA_COMPENSATION_LADDER_RUNG_SCHEMA },
        report_ticker: DNA_REPORT_TICKER_SCHEMA,
      },
      required: [
        'learned',
        'needle',
        'next_72_hours',
        'adaptation_verdict',
        'thesis',
        'primary_opportunity',
        'primary_risk',
        'recommended_habitat',
        'compensation_posture',
        'executive_summary',
        'market_receipt',
        'evidence_ledger',
        'signal_strip',
        'market_signal',
        'compensation_ladder',
        'report_ticker',
      ],
    },
    profile: {
      type: Type.OBJECT,
      properties: {
        strengths: STRING_ARRAY_SCHEMA,
        patterns: STRING_ARRAY_SCHEMA,
        leverage: STRING_ARRAY_SCHEMA,
        report_version: { type: Type.STRING },
        generated_at: { type: Type.STRING },
        section_order: STRING_ARRAY_SCHEMA,
        thesis: { type: Type.STRING },
        target_environment: { type: Type.STRING },
        case_summary: {
          type: Type.OBJECT,
          properties: {
            current_identity: { type: Type.STRING },
            target_identity: { type: Type.STRING },
            constraints: STRING_ARRAY_SCHEMA,
            report_thesis: { type: Type.STRING },
          },
          required: ['current_identity', 'target_identity', 'constraints', 'report_thesis'],
        },
        genome_markers: { type: Type.ARRAY, items: DNA_MARKER_SCHEMA },
        behavioral_propensities: { type: Type.ARRAY, items: DNA_FINDING_SCHEMA },
        pressure_response: { type: Type.ARRAY, items: DNA_FINDING_SCHEMA },
        environmental_fit: {
          type: Type.OBJECT,
          properties: {
            advantaged_in: STRING_ARRAY_SCHEMA,
            punished_in: STRING_ARRAY_SCHEMA,
            adjacency_paths: STRING_ARRAY_SCHEMA,
            recommended_habitat: STRING_ARRAY_SCHEMA,
          },
          required: ['advantaged_in', 'punished_in', 'adjacency_paths', 'recommended_habitat'],
        },
        market_climate: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            national_signals: STRING_ARRAY_SCHEMA,
            occupation_signals: STRING_ARRAY_SCHEMA,
            geography_signals: STRING_ARRAY_SCHEMA,
            company_posture_notes: STRING_ARRAY_SCHEMA,
          },
          required: [
            'summary',
            'national_signals',
            'occupation_signals',
            'geography_signals',
            'company_posture_notes',
          ],
        },
        signal_strip: { type: Type.ARRAY, items: DNA_SIGNAL_STRIP_ITEM_SCHEMA },
        market_signal: DNA_MARKET_SIGNAL_SCHEMA,
        market_demand_analysis: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            environments: { type: Type.ARRAY, items: DNA_MARKET_DEMAND_ENVIRONMENT_SCHEMA },
          },
          required: ['summary', 'environments'],
        },
        compensation_position: {
          type: Type.OBJECT,
          properties: {
            market_value_range: { type: Type.STRING },
            target_ask: { type: Type.STRING },
            ask_justification_receipt: STRING_ARRAY_SCHEMA,
            high_pay_habitats: STRING_ARRAY_SCHEMA,
            underpay_risk_habitats: STRING_ARRAY_SCHEMA,
            negotiation_strategy: STRING_ARRAY_SCHEMA,
          },
          required: [
            'market_value_range',
            'target_ask',
            'ask_justification_receipt',
            'high_pay_habitats',
            'underpay_risk_habitats',
            'negotiation_strategy',
          ],
        },
        compensation_ladder: { type: Type.ARRAY, items: DNA_COMPENSATION_LADDER_RUNG_SCHEMA },
        report_ticker: DNA_REPORT_TICKER_SCHEMA,
        extinction_risks: STRING_ARRAY_SCHEMA,
        adaptive_assets: STRING_ARRAY_SCHEMA,
        lean_into: STRING_ARRAY_SCHEMA,
        let_go: STRING_ARRAY_SCHEMA,
        build_next: STRING_ARRAY_SCHEMA,
        evolution_path_90_days: STRING_ARRAY_SCHEMA,
        source_registry: { type: Type.ARRAY, items: DNA_SOURCE_REGISTRY_ENTRY_SCHEMA },
        evidence_nodes: { type: Type.ARRAY, items: DNA_EVIDENCE_NODE_SCHEMA },
        evidence_notes: { type: Type.ARRAY, items: DNA_EVIDENCE_SCHEMA },
      },
      required: [
        'strengths',
        'patterns',
        'leverage',
        'report_version',
        'generated_at',
        'section_order',
        'thesis',
        'target_environment',
        'case_summary',
        'genome_markers',
        'behavioral_propensities',
        'pressure_response',
        'environmental_fit',
        'market_climate',
        'signal_strip',
        'market_signal',
        'market_demand_analysis',
        'compensation_position',
        'compensation_ladder',
        'report_ticker',
        'extinction_risks',
        'adaptive_assets',
        'lean_into',
        'let_go',
        'build_next',
        'evolution_path_90_days',
        'source_registry',
        'evidence_nodes',
        'evidence_notes',
      ],
    },
  },
  required: ['brief', 'profile'],
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
                description: 'e.g., gemini-2.5-pro, gemini-2.5-flash-image, veo-3.1-generate-preview',
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

export const composeDnaResearchPrompt = ({
  intent,
  preferences,
  answers,
  artifacts,
  config,
  marketSnapshot,
}) => `
Upgrade the existing Brief and Profile into a research-grade Professional DNA report in strict JSON with keys:
- brief
- profile

Client context:
- intent: ${intent}
- pace: ${preferences?.pace ?? 'standard'}
- focus: ${preferences?.focus ?? 'job_search'}

Intake answers:
${renderAnswers(answers)}

Current suite artifacts:
${JSON.stringify(artifacts ?? {}, null, 2)}

Professional DNA configuration:
- enabled sections: ${Array.isArray(config?.enabled_sections) && config.enabled_sections.length ? config.enabled_sections.join(', ') : 'all default sections'}
- section order: ${Array.isArray(config?.section_order) && config.section_order.length ? config.section_order.join(', ') : 'default'}
- company posture notes enabled: ${config?.company_posture_notes_enabled === false ? 'no' : 'yes'}
- research domains: ${Array.isArray(config?.research_domains) && config.research_domains.length ? config.research_domains.join(', ') : 'default domains'}
- refresh window days: ${config?.refresh_window_days ?? 14}

Public market snapshot:
${marketSnapshot}

Output rules:
- Keep the tone sober, premium, and evidence-led.
- Preserve the original actionability of the Brief.
- Separate observed, inferred, and external evidence cleanly.
- Use directional market-value framing, not fake precision.
- Mention company posture and churn tradeoffs only as directional notes, not categorical truths.
- The command bar and market signal panel must be supported by real report fields, not decorative placeholders.
- Distinguish fact from inference explicitly. For example: "BLS data shows..." versus "This suggests...".
- Every external market claim should map to source_registry and evidence_nodes.
- If you cannot support a claim with intake, artifacts, or public-source context, omit it.
- Do not fabricate historical time series. If you need a trajectory and historical data is thin, use a clearly labeled projection path.
- The market demand analysis should compare role habitats or company environments, not generic industries.
- The compensation ladder should express current posture, narrative-adjusted posture, and a plausible ceiling.
- The report ticker should make refresh cadence and evidence counts legible.
- If the data is thin, say so with low-confidence language.
- Fill every schema field.
`;

export const composeIntakeExtractionPrompt = ({ transcript, existingAnswers = {} }) => `
Extract structured Smart Start Intake fields from this voice transcript and return strict JSON.

Rules:
- Only populate fields supported by the transcript with high confidence.
- Leave uncertain fields empty or omit them.
- Do not overwrite existing user-entered fields. Existing values are provided for context only.
- Normalize intent_type to one of: STAY_SHARP, SPECIFIC_MOVE, DESIGN_DIRECTION.
- Normalize ai_usage_frequency to one of: RARELY_OR_NEVER, OCCASIONALLY, REGULARLY, DAILY when possible.
- enterprise_ai_context and target_companies should be arrays of concise strings.
- proof_artifacts, quantified_outcomes, and suppressor_signals should be concise arrays with no filler.
- If the user explicitly confirms the closing synthesis, set synthesis_approval to true.

Existing answers:
${JSON.stringify(existingAnswers, null, 2)}

Transcript:
${transcript}
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
