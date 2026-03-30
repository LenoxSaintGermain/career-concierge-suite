import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CLIENT_INTENTS,
  FOCUS_PREFS,
  FREE_TIER_SMART_START_FIELD_IDS,
  PACE_PREFS,
  SMART_START_FIELDS,
} from '../constants';
import {
  ClientDoc,
  ClientIntent,
  ClientPreferences,
  FocusPreference,
  IntakeAnswers,
  IntakeAnswerValue,
  PacePreference,
  PublicConfig,
  SuiteModuleId,
} from '../types';
import { saveIntake } from '../services/clientService';
import { upsertArtifact } from '../services/artifactService';
import {
  generateAIProfileDoc,
  generateBrief,
  generateCjsExecutionDoc,
  generateGapsDoc,
  generatePlan,
  generateProfileDoc,
  generateReadinessDoc,
  generateSuiteDistilledDoc,
} from '../services/stubGenerator';
import { generateSuiteArtifacts } from '../services/suiteApi';
import { extractIntakeFromTranscript } from '../services/voiceApi';
import { ElevenLabsConvaiPanel } from './ElevenLabsConvaiPanel';
import { GeminiLivePanel } from './GeminiLivePanel';

type Step = 'active' | 'plating' | 'done';
type VoiceSessionState = 'idle' | 'connecting' | 'connected' | 'completed' | 'error';
type IntakeSectionId = 'positioning' | 'context' | 'evidence' | 'calibration';

const SUITE_FEEL_OPTIONS = ['STRATEGIC', 'GROUNDED', 'STORY', 'JOB-SEARCH', 'SKILLS', 'LEADERSHIP'];
const BENEFITS_OPTIONS = [
  { label: 'Not yet', value: 'NOT_YET' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'In progress', value: 'IN_PROGRESS' },
] as const;
const AI_USAGE_OPTIONS = [
  { label: 'Rarely or Never', value: 'RARELY_OR_NEVER' },
  { label: 'Occasionally', value: 'OCCASIONALLY' },
  { label: 'Regularly', value: 'REGULARLY' },
  { label: 'Daily', value: 'DAILY' },
] as const;
const INTENT_COPY: Record<ClientIntent, { label: string; description: string }> = {
  current_role: {
    label: 'Stay sharp in my current role',
    description: 'Protect momentum, increase signal, and strengthen leverage where I already operate.',
  },
  target_role: {
    label: 'Move into a specific next role',
    description: 'Build a case for a defined move, with evidence, fit, and compensation clarity.',
  },
  not_sure: {
    label: 'Help me design the direction',
    description: 'Surface the strongest path before I overinvest in the wrong market story.',
  },
};

const INTAKE_SECTIONS: Array<{
  id: IntakeSectionId;
  kicker: string;
  title: string;
  description: string;
  screenId: 'screen_1' | 'screen_2' | 'screen_3' | 'screen_4';
  fieldIds: string[];
}> = [
  {
    id: 'positioning',
    kicker: 'Act I',
    title: 'Positioning',
    description: 'Anchor the move: intent, target, compensation posture, and the kind of result the suite should optimize for.',
    screenId: 'screen_1',
    fieldIds: [
      'outcomes_goals',
      'target_compensation_level',
      'current_or_target_job_title',
      'current_or_target_salary',
      'benefits_timing',
      'suite_feel',
    ],
  },
  {
    id: 'context',
    kicker: 'Act II',
    title: 'Current context',
    description: 'Ground the operating environment so Donna and the suite stop guessing about your real constraints and market habitat.',
    screenId: 'screen_2',
    fieldIds: ['current_title', 'industry', 'ai_usage_frequency', 'enterprise_context', 'job_description'],
  },
  {
    id: 'evidence',
    kicker: 'Act III',
    title: 'Proof and inputs',
    description: 'Bring the strongest evidence into the room so the later artifacts have material worth compounding.',
    screenId: 'screen_3',
    fieldIds: ['resume_source', 'bio_alignment_requested', 'foundational_interests', 'advanced_interests', 'learning_modalities'],
  },
  {
    id: 'calibration',
    kicker: 'Act IV',
    title: 'Calibration',
    description: 'Clarify direction, pressure points, working style, and the pacing preferences the suite should respect.',
    screenId: 'screen_4',
    fieldIds: ['target', 'pressure_breaks', 'work_style', 'constraints', 'pace', 'focus'],
  },
];

const SCREEN_TO_SECTION: Record<'screen_1' | 'screen_2' | 'screen_3' | 'screen_4', IntakeSectionId> = {
  screen_1: 'positioning',
  screen_2: 'context',
  screen_3: 'evidence',
  screen_4: 'calibration',
};

const intakeTheme = {
  '--intake-bg': '#EDEAE2',
  '--intake-bg-alt': '#E5E2DA',
  '--intake-dark': '#1B1E1C',
  '--intake-dark-mid': '#252A27',
  '--intake-teal': '#4B9E8D',
  '--intake-teal-dim': '#2D7A6B',
  '--intake-teal-light': '#6BBFAF',
  '--intake-teal-bg': '#E0F0ED',
  '--intake-amber': '#C9853A',
  '--intake-border': '#D0CEC5',
  '--intake-border-dark': '#303530',
  '--intake-cream': '#F5F2EA',
  '--intake-muted': '#8A8A7A',
  '--intake-muted-light': '#AEADA0',
} as React.CSSProperties;

const inputBaseClass =
  'w-full border border-[var(--intake-border)] bg-white px-2.5 py-1.5 text-xs text-[#1B1E1C] outline-none transition-colors focus:border-[var(--intake-teal)]';
const secondaryButtonClass =
  'border border-[var(--intake-border)] bg-transparent px-4 py-3 font-intake-mono text-[10px] uppercase tracking-[0.12em] text-[#1B1E1C] transition-colors hover:border-[var(--intake-teal)]';
const primaryButtonClass =
  'bg-[var(--intake-teal)] px-4 py-3 font-intake-mono text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[var(--intake-teal-dim)] disabled:opacity-50';

const seededArrayFieldIds = new Set([
  'outcomes_goals',
  'enterprise_context',
  'foundational_interests',
  'advanced_interests',
  'learning_modalities',
  'voice_extracted_fields',
]);
const seededBooleanFieldIds = new Set([
  'benefits_under_review',
  'bio_alignment_requested',
  'voice_session_completed',
  'synthesis_approval',
]);

const isValueFilled = (value: IntakeAnswerValue | undefined) => {
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return false;
};

const dedupeStrings = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
const normalizeSeededAnswers = (incoming: IntakeAnswers | undefined): IntakeAnswers => {
  const normalized: IntakeAnswers = {};
  const source = incoming ?? {};

  Object.entries(source).forEach(([key, value]) => {
    if (value == null) return;
    if (seededArrayFieldIds.has(key)) {
      normalized[key] = Array.isArray(value)
        ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
        : typeof value === 'string'
          ? [value].filter(Boolean)
          : [];
      return;
    }
    if (seededBooleanFieldIds.has(key)) {
      normalized[key] = value === true;
      return;
    }
    if (Array.isArray(value)) {
      normalized[key] = value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
      return;
    }
    if (typeof value === 'boolean') {
      normalized[key] = value;
      return;
    }
    normalized[key] = String(value);
  });

  return normalized;
};

const mapIntentToIntakeType = (intent: ClientIntent) =>
  intent === 'current_role' ? 'STAY_SHARP' : intent === 'target_role' ? 'SPECIFIC_MOVE' : 'DESIGN_DIRECTION';

const normalizeAnswersForSubmission = (intent: ClientIntent, answers: IntakeAnswers): IntakeAnswers => {
  const normalized: IntakeAnswers = { ...answers };
  normalized.intent_type = mapIntentToIntakeType(intent);
  normalized.outcome_goals = Array.isArray(answers.outcomes_goals) ? answers.outcomes_goals : [];
  normalized.comp_level = typeof answers.target_compensation_level === 'string' ? answers.target_compensation_level : '';
  normalized.target_title =
    typeof answers.current_or_target_job_title === 'string' ? answers.current_or_target_job_title : '';
  normalized.salary_range =
    typeof answers.current_or_target_salary === 'string' ? answers.current_or_target_salary : '';
  normalized.comp_range = typeof answers.current_or_target_salary === 'string' ? answers.current_or_target_salary : '';
  normalized.benefits_timing =
    typeof answers.benefits_timing === 'string' ? answers.benefits_timing : 'NOT_YET';
  normalized.benefits_under_review = normalized.benefits_timing !== 'NOT_YET';
  normalized.enterprise_ai_context = Array.isArray(answers.enterprise_context) ? answers.enterprise_context : [];
  normalized.resume_url = typeof answers.resume_source === 'string' ? answers.resume_source : '';
  normalized.align_bio_on_upload = answers.bio_alignment_requested === true;
  normalized.learning_modality = Array.isArray(answers.learning_modalities) ? answers.learning_modalities : [];
  normalized.direction_aim = typeof answers.target === 'string' ? answers.target : '';
  normalized.momentum_source = typeof answers.work_style === 'string' ? answers.work_style : '';
  normalized.tone_preference =
    typeof answers.suite_feel === 'string' && answers.suite_feel ? [answers.suite_feel] : [];
  normalized.voice_extracted_fields = Array.isArray(answers.voice_extracted_fields) ? answers.voice_extracted_fields : [];
  return normalized;
};

function FieldShell({
  label,
  fieldId,
  voiceFilled,
  ghostFocused,
  helper,
  children,
  wide = false,
}: {
  label: string;
  fieldId?: string;
  voiceFilled?: boolean;
  ghostFocused?: boolean;
  helper?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      data-intake-field={fieldId}
      className={`flex flex-col gap-1 transition-all ${wide ? 'md:col-span-2' : ''} ${
        ghostFocused ? 'rounded-[2px] bg-[var(--intake-teal-bg)] p-3 ring-1 ring-[var(--intake-teal)]/45' : ''
      }`}
    >
      <div className="flex items-center gap-2 font-intake-mono text-[8px] uppercase tracking-[0.18em] text-[var(--intake-muted)]">
        <span>{label}</span>
        {fieldId && voiceFilled ? (
          <span className="text-[var(--intake-teal)]">{'<-'} voice</span>
        ) : null}
      </div>
      {helper ? <div className="font-intake-body text-[10px] leading-relaxed text-[var(--intake-muted)]">{helper}</div> : null}
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  multi = false,
}: {
  options: Array<{ label: string; value: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`border bg-white px-2 py-1 font-intake-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              active
                ? 'border-t-2 border-[var(--intake-teal)] bg-[var(--intake-teal-bg)] text-[var(--intake-teal-dim)]'
                : 'border-[var(--intake-border)] text-[#1B1E1C] hover:bg-[var(--intake-teal-bg)]'
            }`}
            aria-pressed={active}
          >
            {option.label}
            {!multi && active ? null : null}
          </button>
        );
      })}
    </div>
  );
}

export function IntakeFlow(props: {
  uid: string;
  tier?: string;
  client?: ClientDoc | null;
  isAdminUser?: boolean;
  voiceConfig: PublicConfig['voice'];
  intakeConfig: PublicConfig['professional_dna'];
  onComplete: (
    nextModuleId: SuiteModuleId,
    payload: { intent: ClientIntent; preferences: ClientPreferences; answers: IntakeAnswers }
  ) => void;
}) {
  const isFreeTier = props.tier === 'free_foundation_access';
  const [step, setStep] = useState<Step>('active');
  const [intent, setIntent] = useState<ClientIntent>('current_role');
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [pace, setPace] = useState<PacePreference>('standard');
  const [focus, setFocus] = useState<FocusPreference>('job_search');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSessionState, setVoiceSessionState] = useState<VoiceSessionState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceAutofillBusy, setVoiceAutofillBusy] = useState(false);
  const [ghostFocusedFieldId, setGhostFocusedFieldId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<IntakeSectionId>('positioning');
  const [voiceLaneChoice, setVoiceLaneChoice] = useState<PublicConfig['voice']['active_panel']>(
    props.voiceConfig.active_panel,
  );
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const prefs: ClientPreferences = useMemo(() => ({ pace, focus }), [pace, focus]);
  const fieldOptions = useMemo(() => {
    const map = new Map<string, string[]>();
    SMART_START_FIELDS.forEach((field) => {
      map.set(field.id, field.options ?? []);
    });
    return map;
  }, []);
  const freeTierFieldSet = useMemo(() => new Set(FREE_TIER_SMART_START_FIELD_IDS), []);
  const fieldMeta = useMemo(() => new Map(SMART_START_FIELDS.map((field) => [field.id, field])), []);
  const sectionByField = useMemo(() => {
    const map = new Map<string, IntakeSectionId>();
    INTAKE_SECTIONS.forEach((section) => {
      section.fieldIds.forEach((fieldId) => map.set(fieldId, section.id));
    });
    return map;
  }, []);
  const ghostTextFields = useMemo(
    () =>
      new Set([
        'current_or_target_job_title',
        'current_or_target_salary',
        'current_title',
        'industry',
        'job_description',
        'resume_source',
        'target',
        'timeline_urgency',
        'pressure_breaks',
        'work_style',
        'constraints',
      ]),
    [],
  );
  const ghostChoiceOptions = useMemo(
    () =>
      new Map<string, string[]>([
        ['target_compensation_level', fieldOptions.get('target_compensation_level') ?? []],
        ['benefits_timing', BENEFITS_OPTIONS.map((option) => option.value)],
        ['ai_usage_frequency', AI_USAGE_OPTIONS.map((option) => option.value)],
        ['suite_feel', SUITE_FEEL_OPTIONS],
      ]),
    [fieldOptions],
  );
  const ghostMultiFields = useMemo(
    () =>
      new Set([
        'outcomes_goals',
        'enterprise_context',
        'foundational_interests',
        'advanced_interests',
        'learning_modalities',
      ]),
    [],
  );
  const ghostBooleanFields = useMemo(
    () => new Set(['bio_alignment_requested']),
    [],
  );

  const hasAutofillSource = useMemo(
    () => Boolean(props.client?.intake?.answers || props.client?.demo_profile),
    [props.client?.demo_profile, props.client?.intake?.answers]
  );

  const clientDisplayName = props.client?.display_name || (props.client?.demo_profile as any)?.name || '';
  const clientGreeting = clientDisplayName ? `Welcome back, ${clientDisplayName}.` : 'Let\u2019s get started.';
  const availableVoiceLanes = useMemo(
    () =>
      props.voiceConfig.elevenlabs_enabled
        ? ([
            { id: 'elevenlabs', label: 'Donna via ElevenLabs', meta: 'Direct form control and action feed' },
            { id: 'gemini_live', label: 'Gemini Native Live API', meta: 'Native audio lane with transcript extraction' },
          ] as const)
        : ([{ id: 'gemini_live', label: 'Gemini Native Live API', meta: 'Native audio lane with transcript extraction' }] as const),
    [props.voiceConfig.elevenlabs_enabled],
  );
  const activeSection = INTAKE_SECTIONS.find((section) => section.id === activeSectionId) ?? INTAKE_SECTIONS[0];

  const readText = (id: string) => (typeof answers[id] === 'string' ? (answers[id] as string) : '');
  const readList = (id: string) => (Array.isArray(answers[id]) ? (answers[id] as string[]) : []);
  const readBool = (id: string) => answers[id] === true;
  const voiceFieldSet = useMemo(
    () => new Set(Array.isArray(answers.voice_extracted_fields) ? answers.voice_extracted_fields : []),
    [answers.voice_extracted_fields]
  );
  const isFieldAvailable = (id: string) => !isFreeTier || freeTierFieldSet.has(id);

  useEffect(() => {
    setVoiceLaneChoice(
      props.voiceConfig.active_panel === 'elevenlabs' && props.voiceConfig.elevenlabs_enabled
        ? 'elevenlabs'
        : 'gemini_live',
    );
  }, [props.voiceConfig.active_panel, props.voiceConfig.elevenlabs_enabled]);

  const scrollToSection = (sectionId: IntakeSectionId) => {
    setActiveSectionId(sectionId);
    const target = sectionRefs.current[sectionId];
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const markGhostFieldApplied = (fieldId: string) => {
    setGhostFocusedFieldId(fieldId);
    const sectionId = sectionByField.get(fieldId);
    if (sectionId) {
      scrollToSection(sectionId);
    }
    const target = typeof document !== 'undefined' ? document.querySelector<HTMLElement>(`[data-intake-field="${fieldId}"]`) : null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      setGhostFocusedFieldId((prev) => (prev === fieldId ? null : prev));
    }, 2200);
  };

  const appendVoiceFieldFlag = (base: IntakeAnswers, fieldId: string) =>
    dedupeStrings([...(Array.isArray(base.voice_extracted_fields) ? base.voice_extracted_fields : []), fieldId]);

  const normalizeGhostOption = (fieldId: string, rawValue: string) => {
    const options = ghostChoiceOptions.get(fieldId) ?? fieldOptions.get(fieldId) ?? [];
    const candidate = rawValue.trim().toLowerCase();
    if (!candidate) return '';
    const matched = options.find((option) => option.toLowerCase() === candidate);
    if (matched) return matched;
    const includes = options.find((option) => option.toLowerCase().includes(candidate) || candidate.includes(option.toLowerCase()));
    return includes || '';
  };

  const normalizeGhostMultiValues = (fieldId: string, values: string[]) => {
    const options = fieldOptions.get(fieldId) ?? [];
    if (!options.length) return dedupeStrings(values);
    const normalized = values
      .map((value) => {
        const candidate = value.trim().toLowerCase();
        return (
          options.find((option) => option.toLowerCase() === candidate) ||
          options.find((option) => option.toLowerCase().includes(candidate) || candidate.includes(option.toLowerCase())) ||
          ''
        );
      })
      .filter(Boolean);
    return dedupeStrings(normalized);
  };

  const setValue = (id: string, value: IntakeAnswerValue) =>
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));

  const setText = (id: string, value: string) => setValue(id, value);
  const setList = (id: string, value: string[]) => setValue(id, value);
  const toggleList = (id: string, value: string) => {
    const existing = readList(id);
    setList(id, existing.includes(value) ? existing.filter((entry) => entry !== value) : [...existing, value]);
  };

  const buildProfileAutofillState = () => {
    const seededAnswers = normalizeSeededAnswers(props.client?.intake?.answers);
    const demoProfile = props.client?.demo_profile ?? {};
    const inferredAnswers: IntakeAnswers = {
      ...seededAnswers,
      current_title:
        typeof seededAnswers.current_title === 'string'
          ? seededAnswers.current_title
          : typeof seededAnswers.current_or_target_job_title === 'string'
            ? seededAnswers.current_or_target_job_title
            : (demoProfile as any)?.name || '',
      suite_feel:
        typeof seededAnswers.suite_feel === 'string'
          ? seededAnswers.suite_feel
          : props.client?.preferences?.focus === 'leadership'
            ? 'LEADERSHIP'
            : props.client?.preferences?.focus === 'skills'
              ? 'SKILLS'
              : 'STRATEGIC',
    };

    return {
      nextIntent: props.client?.intent ?? intent,
      nextPace: props.client?.preferences?.pace ?? pace,
      nextFocus: props.client?.preferences?.focus ?? focus,
      nextAnswers: inferredAnswers,
    };
  };

  const mergeOnlyEmptyAnswers = (base: IntakeAnswers, incoming: IntakeAnswers) => {
    const next: IntakeAnswers = { ...base };
    Object.entries(incoming).forEach(([key, value]) => {
      if (!isValueFilled(base[key])) {
        next[key] = value;
      }
    });
    return next;
  };

  const applyProfileAutofill = (nextStep?: Step, onlyEmpty = false) => {
    const next = buildProfileAutofillState();
    setIntent(next.nextIntent);
    setPace(next.nextPace);
    setFocus(next.nextFocus);
    setAnswers((prev) => (onlyEmpty ? mergeOnlyEmptyAnswers(prev, next.nextAnswers) : next.nextAnswers));
    setError(null);
    if (nextStep) setStep(nextStep);
  };

  const mergeVoiceExtractedFields = (extractedAnswers: IntakeAnswers, sessionId?: string, completed = true) => {
    setAnswers((prev) => {
      const merged: IntakeAnswers = { ...prev };
      const appliedFields: string[] = Array.isArray(prev.voice_extracted_fields) ? [...prev.voice_extracted_fields] : [];

      Object.entries(extractedAnswers).forEach(([key, value]) => {
        if (!isValueFilled(prev[key])) {
          merged[key] = value;
          appliedFields.push(key);
        }
      });

      merged.voice_session_id = sessionId || readText('voice_session_id');
      merged.voice_session_completed = completed;
      merged.voice_extracted_fields = dedupeStrings(appliedFields);

      if (!isValueFilled(prev.current_or_target_salary) && typeof merged.comp_range === 'string' && merged.comp_range) {
        merged.current_or_target_salary = merged.comp_range;
        merged.salary_range = merged.comp_range;
      }
      if (!isValueFilled(prev.current_or_target_job_title) && typeof merged.target_title === 'string' && merged.target_title) {
        merged.current_or_target_job_title = merged.target_title;
      }
      if (!isValueFilled(prev.enterprise_context) && Array.isArray(merged.enterprise_ai_context)) {
        merged.enterprise_context = merged.enterprise_ai_context;
      }

      return merged;
    });
  };

  const summarizeGhostIntakeState = () => {
    const filledFields = Object.entries(answers)
      .filter(([key, value]) => key !== 'voice_extracted_fields' && isValueFilled(value))
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .slice(0, 12);
    return [
      `Intake is a guided workspace. Current section: ${activeSection.title}.`,
      `Intent: ${intent}. Pace: ${pace}. Focus: ${focus}.`,
      filledFields.length ? `Captured fields: ${filledFields.join(' | ')}.` : 'Captured fields: none yet.',
    ].join(' ');
  };

  const ghostCallbacks = useMemo(
    () => ({
      onNavigateModule: (target: string) => {
        if (target === 'intake') {
          return 'Already in Smart Start Intake.';
        }
        return `Intake lane only. ${target} remains outside the current Smart Start surface.`;
      },
      onCloseModule: () => {
        return 'Voice rail is always visible in this layout.';
      },
      onToggleAdmin: () => (props.isAdminUser ? 'Admin controls are available outside the intake rail.' : 'Admin tools are locked for this account.'),
      onDispatchAgent: (codename: string) => `Agent dispatch acknowledged for ${codename}. Use the main suite shell to review the mission.`,
      onUpdateStance: (stance: 'delegator' | 'copilot') => `Operating stance noted as ${stance}.`,
      onAddressGap: (gapId: string) => `Gap action for ${gapId} belongs to the post-intake suite, not Smart Start.`,
      onFocusIntakeField: (fieldId: string) => {
        if (!fieldMeta.has(fieldId) && !['timeline_urgency', 'suite_feel'].includes(fieldId)) {
          return `Field ${fieldId} is not available in Smart Start Intake.`;
        }
        markGhostFieldApplied(fieldId);
        return `Focused ${fieldId}.`;
      },
      onJumpIntakeScreen: (_screenId: string) => {
        const sectionId = SCREEN_TO_SECTION[_screenId as keyof typeof SCREEN_TO_SECTION];
        if (!sectionId) return `Screen ${_screenId} is not a valid Smart Start step.`;
        scrollToSection(sectionId);
        return `Moved to ${sectionId}.`;
      },
      onSetIntakeTextField: (fieldId: string, value: string) => {
        if (!ghostTextFields.has(fieldId)) return `Field ${fieldId} is not a text field in Smart Start Intake.`;
        const nextValue = value.trim();
        if (!nextValue) return `No text provided for ${fieldId}.`;
        setAnswers((prev) => ({
          ...prev,
          [fieldId]: nextValue,
          voice_extracted_fields: appendVoiceFieldFlag(prev, fieldId),
        }));
        markGhostFieldApplied(fieldId);
        return `${fieldId} updated.`;
      },
      onSetIntakeChoiceField: (fieldId: string, value: string) => {
        if (!ghostChoiceOptions.has(fieldId)) return `Field ${fieldId} is not a choice field in Smart Start Intake.`;
        const normalized = normalizeGhostOption(fieldId, value);
        if (!normalized) return `Value ${value} is not valid for ${fieldId}.`;
        setAnswers((prev) => {
          const next: IntakeAnswers = {
            ...prev,
            [fieldId]: normalized,
            voice_extracted_fields: appendVoiceFieldFlag(prev, fieldId),
          };
          if (fieldId === 'benefits_timing') {
            next.benefits_under_review = normalized !== 'NOT_YET';
          }
          if (fieldId === 'suite_feel') {
            next.tone_preference = [normalized];
          }
          return next;
        });
        markGhostFieldApplied(fieldId);
        return `${fieldId} set to ${normalized}.`;
      },
      onSetIntakeMultiField: (fieldId: string, values: string[], mode: 'replace' | 'add' | 'remove') => {
        if (!ghostMultiFields.has(fieldId)) return `Field ${fieldId} is not a multi-select field in Smart Start Intake.`;
        const normalizedValues = normalizeGhostMultiValues(fieldId, values);
        if (!normalizedValues.length) return `No valid options supplied for ${fieldId}.`;
        setAnswers((prev) => {
          const existing = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
          const nextValues =
            mode === 'add'
              ? dedupeStrings([...existing, ...normalizedValues])
              : mode === 'remove'
                ? existing.filter((value) => !normalizedValues.includes(value))
                : normalizedValues;
          return {
            ...prev,
            [fieldId]: nextValues,
            voice_extracted_fields: appendVoiceFieldFlag(prev, fieldId),
          };
        });
        markGhostFieldApplied(fieldId);
        return `${fieldId} updated with ${normalizedValues.join(', ')}.`;
      },
      onSetIntakeBooleanField: (fieldId: string, value: boolean) => {
        if (!ghostBooleanFields.has(fieldId)) return `Field ${fieldId} is not a boolean field in Smart Start Intake.`;
        setAnswers((prev) => ({
          ...prev,
          [fieldId]: value,
          voice_extracted_fields: appendVoiceFieldFlag(prev, fieldId),
        }));
        markGhostFieldApplied(fieldId);
        return `${fieldId} set to ${value ? 'true' : 'false'}.`;
      },
      onClearIntakeField: (fieldId: string) => {
        if (!fieldMeta.has(fieldId) && !ghostChoiceOptions.has(fieldId) && !ghostTextFields.has(fieldId) && !ghostBooleanFields.has(fieldId)) {
          return `Field ${fieldId} is not available in Smart Start Intake.`;
        }
        setAnswers((prev) => {
          const next: IntakeAnswers = { ...prev };
          delete next[fieldId];
          if (fieldId === 'benefits_timing') next.benefits_under_review = false;
          if (fieldId === 'suite_feel') delete next.tone_preference;
          return next;
        });
        markGhostFieldApplied(fieldId);
        return `${fieldId} cleared.`;
      },
      onSetIntentRoute: (nextIntent: string) => {
        if (!CLIENT_INTENTS.includes(nextIntent as ClientIntent)) return `Intent ${nextIntent} is not valid.`;
        setIntent(nextIntent as ClientIntent);
        scrollToSection('positioning');
        return `Intent set to ${nextIntent}.`;
      },
      onSetSupportPreference: (preference: 'pace' | 'focus', value: string) => {
        if (preference === 'pace') {
          if (!PACE_PREFS.includes(value as PacePreference)) return `Pace ${value} is not valid.`;
          setPace(value as PacePreference);
          scrollToSection('calibration');
          return `Pace set to ${value}.`;
        }
        if (!FOCUS_PREFS.includes(value as FocusPreference)) return `Focus ${value} is not valid.`;
        setFocus(value as FocusPreference);
        scrollToSection('calibration');
        return `Focus set to ${value}.`;
      },
      onSummarizeIntakeState: () => summarizeGhostIntakeState(),
    }),
    [
      activeSection.title,
      answers,
      fieldMeta,
      focus,
      ghostBooleanFields,
      ghostChoiceOptions,
      ghostMultiFields,
      ghostTextFields,
      intent,
      pace,
      props.isAdminUser,
      sectionByField,
      ],
  );

  const ghostSessionContext = useMemo(() => {
    const allFields = SMART_START_FIELDS.map((field) => `${field.id}: ${field.label}`).slice(0, 16);

    return [
      'Smart Start Intake context is active. Use the current section as the main conversation frame.',
      summarizeGhostIntakeState(),
      `Sections: ${INTAKE_SECTIONS.map((section) => `${section.screenId}=${section.title}`).join(' | ')}.`,
      `All intake fields: ${allFields.join(' | ')}.`,
      `Choice fields: target_compensation_level=${(ghostChoiceOptions.get('target_compensation_level') ?? []).join(', ')} | benefits_timing=${(ghostChoiceOptions.get('benefits_timing') ?? []).join(', ')} | ai_usage_frequency=${(ghostChoiceOptions.get('ai_usage_frequency') ?? []).join(', ')} | suite_feel=${(ghostChoiceOptions.get('suite_feel') ?? []).join(', ')}.`,
      `Use intake tools to focus fields, change sections, set values, and summarize state. Ask from the visible section first and never invent values.`,
    ].join(' ');
  }, [activeSection.title, ghostChoiceOptions, summarizeGhostIntakeState]);

  const handleVoiceSessionComplete = async (payload: { transcript: string; sessionId?: string; completed: boolean }) => {
    setVoiceSessionState(payload.completed ? 'completed' : 'idle');
    setVoiceError(null);
    if (!props.intakeConfig.voice_to_form_autofill) {
      setAnswers((prev) => ({
        ...prev,
        voice_session_id: payload.sessionId || '',
        voice_session_completed: payload.completed,
      }));
      return;
    }

    setVoiceAutofillBusy(true);
    try {
      const extraction = await extractIntakeFromTranscript(payload.transcript, answers);
      mergeVoiceExtractedFields(extraction.extracted as IntakeAnswers, payload.sessionId, payload.completed);
    } catch (extractionError: any) {
      setVoiceError(extractionError?.message ?? 'Unable to structure the voice session into intake fields.');
    } finally {
      setVoiceAutofillBusy(false);
    }
  };

  // Auto-populate from Firestore on mount
  useEffect(() => {
    if (!hasAutofillSource) return;
    applyProfileAutofill(undefined, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitWithPayload = async (
    nextIntent: ClientIntent,
    nextPreferences: ClientPreferences,
    rawAnswers: IntakeAnswers
  ) => {
    setBusy(true);
    setError(null);
    try {
      const nextAnswers = normalizeAnswersForSubmission(nextIntent, rawAnswers);
      const intakePayload = { intent: nextIntent, preferences: nextPreferences, answers: nextAnswers };
      await saveIntake(props.uid, intakePayload);
      setStep('plating');

      if (isFreeTier) {
        const readiness = generateReadinessDoc(nextAnswers);
        const resourceGuide = {
          resource_guide: [
            'Intro path: AI essentials for career acceleration.',
            'Workflow starter: one prompt template + one execution loop.',
            'Upgrade unlock: personalized Brief, Plan, and concierge support.',
          ],
          upgrade_cta: 'Upgrade to unlock full personalized suite artifacts and ConciergeJobSearch.',
        };
        await upsertArtifact(props.uid, 'readiness', 'AI Readiness Assessment', {
          ...readiness,
          ...resourceGuide,
        } as any);
        setStep('done');
        props.onComplete('readiness', intakePayload);
        return;
      }

      let brief: any, plan: any, profile: any, aiProfile: any, gaps: any;
      try {
        const artifacts = await generateSuiteArtifacts({
          intent: nextIntent,
          preferences: nextPreferences,
          answers: nextAnswers,
        });
        brief = artifacts.brief;
        plan = artifacts.plan;
        profile = artifacts.profile;
        aiProfile = artifacts.ai_profile;
        gaps = artifacts.gaps;
      } catch {
        brief = generateBrief(nextAnswers);
        plan = generatePlan(nextAnswers);
        profile = generateProfileDoc(nextAnswers);
        aiProfile = generateAIProfileDoc(nextAnswers);
        gaps = generateGapsDoc(nextAnswers);
      }

      await Promise.all([
        upsertArtifact(props.uid, 'brief', 'The Brief', brief),
        upsertArtifact(props.uid, 'suite_distilled', 'Your Suite, Distilled', generateSuiteDistilledDoc(brief, nextAnswers)),
        upsertArtifact(props.uid, 'plan', 'Your Plan', plan),
        upsertArtifact(props.uid, 'profile', 'Your Profile', profile),
        upsertArtifact(props.uid, 'ai_profile', 'Mission Control', aiProfile),
        upsertArtifact(props.uid, 'gaps', 'Your Gaps', gaps),
        upsertArtifact(props.uid, 'readiness', 'AI Readiness Assessment', generateReadinessDoc(nextAnswers)),
        upsertArtifact(props.uid, 'cjs_execution', 'ConciergeJobSearch Execution', generateCjsExecutionDoc(nextAnswers, nextIntent)),
      ]);

      setStep('done');
      const nextModuleId: SuiteModuleId = nextIntent === 'not_sure' ? 'my_concierge' : 'brief';
      props.onComplete(nextModuleId, intakePayload);
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Unable to complete intake.');
      setStep('active');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => submitWithPayload(intent, prefs, answers);
  const sectionCompletion = (sectionId: IntakeSectionId) => {
    const section = INTAKE_SECTIONS.find((entry) => entry.id === sectionId);
    if (!section) return { filled: 0, total: 0 };
    const visibleFieldIds = section.fieldIds.filter((fieldId) => {
      if (fieldId === 'pace' || fieldId === 'focus') return true;
      return isFieldAvailable(fieldId);
    });
    const filled = visibleFieldIds.filter((fieldId) => {
      if (fieldId === 'pace' || fieldId === 'focus') return true;
      return isValueFilled(answers[fieldId]);
    }).length;
    return { filled, total: visibleFieldIds.length };
  };

  const renderVoiceLane = () => {
    if (step !== 'active') {
      return (
        <div className="border border-[#163840] bg-[#07161a] p-4 text-[#dce7e8] shadow-[0_14px_40px_rgba(1,12,18,0.24)]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">Donna stepping out</div>
          <div className="mt-3 text-lg font-editorial italic text-[#e7f1f2]">
            Your intake is now processing.
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#c6d6d8]">
            The live session is paused while the suite builds your artifacts. Stay here until processing completes.
          </p>
        </div>
      );
    }

    if (voiceLaneChoice === 'elevenlabs' && props.voiceConfig.elevenlabs_enabled) {
      return (
        <ElevenLabsConvaiPanel
          key="elevenlabs"
          agentId={props.voiceConfig.elevenlabs_agent_id}
          userUid={props.uid}
          sessionContext={ghostSessionContext}
          ghostCallbacks={ghostCallbacks}
          interactionLocked={busy || step === 'plating'}
          lockedMessage="Donna has stepped out while your intake is being processed."
          onStateChange={(state) =>
            setVoiceSessionState(
              state === 'connected'
                ? 'connected'
                : state === 'connecting'
                  ? 'connecting'
                  : state === 'error'
                    ? 'error'
                    : 'idle',
            )
          }
        />
      );
    }

    return (
      <GeminiLivePanel
        key="gemini"
        layout="compact"
        transcriptVisible={props.intakeConfig.voice_transcription_visible !== false}
        interactionLocked={busy || step === 'plating'}
        lockedMessage="Gemini has stepped out while your intake is being processed."
        onSessionComplete={handleVoiceSessionComplete}
        onStateChange={setVoiceSessionState}
      />
    );
  };

  const renderSubmitCard = () => (
    <div className="border border-[var(--intake-border)] bg-[var(--intake-cream)] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="font-intake-mono text-[9px] uppercase tracking-[0.2em] text-[var(--intake-teal-dim)]">
            Finalize intake
          </div>
          <div className="mt-2 font-intake-body text-2xl font-medium leading-tight text-[#1B1E1C]">
            Once this runs, Donna steps out and the suite starts building.
          </div>
          <p className="mt-3 font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
            This transition is intentional. Stay in this module until the Brief or MyConcierge handoff is ready.
          </p>
        </div>

        <div className="w-full max-w-sm">
          {error ? (
            <div className="mb-3 border border-[#C9853A] bg-[#F4E8DA] px-3 py-2 font-intake-body text-xs leading-relaxed text-[#6E4318]">
              {error}
            </div>
          ) : null}
          {voiceError ? (
            <div className="mb-3 border border-[var(--intake-border-dark)] bg-[#2E2018] px-3 py-2 font-intake-body text-xs leading-relaxed text-[#F5D7C1]">
              {voiceError}
            </div>
          ) : null}
          {hasAutofillSource ? (
            <button
              type="button"
              onClick={() => applyProfileAutofill(undefined, true)}
              className={`mb-2 w-full ${secondaryButtonClass}`}
            >
              Autofill from profile
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={busy || voiceAutofillBusy}
            className={`w-full ${primaryButtonClass}`}
          >
            {busy ? 'Preparing your suite...' : 'Generate my suite ->'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col bg-[var(--intake-bg)]" style={intakeTheme}>
      <div className="grid flex-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-4">
            <div className="border border-[var(--intake-border)] bg-[var(--intake-cream)] p-5">
              <div className="font-intake-mono text-[9px] uppercase tracking-[0.22em] text-[var(--intake-teal-dim)]">
                Smart Start Intake
              </div>
              <div className="mt-2 font-intake-body text-[2rem] font-medium leading-[1.02] text-[#1B1E1C]">
                {clientGreeting}
              </div>
              <p className="mt-3 font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
                Donna and the form now work in one place. Watch the highlighted section and current field while you answer.
              </p>

              {props.intakeConfig.voice_agent_enabled !== false ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {availableVoiceLanes.map((lane) => (
                    <button
                      key={lane.id}
                      type="button"
                      onClick={() => setVoiceLaneChoice(lane.id)}
                      className={`border px-3 py-2 text-left transition-colors ${
                        voiceLaneChoice === lane.id
                          ? 'border-t-2 border-[var(--intake-teal)] bg-[var(--intake-teal-bg)]'
                          : 'border-[var(--intake-border)] bg-white hover:border-[var(--intake-teal)]'
                      }`}
                    >
                      <div className="font-intake-mono text-[9px] uppercase tracking-[0.12em] text-[var(--intake-muted)]">
                        {lane.label}
                      </div>
                      <div className="mt-1 font-intake-body text-[11px] leading-snug text-[#1B1E1C]">{lane.meta}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--intake-border)] pt-4">
                <span className="font-intake-mono text-[9px] uppercase tracking-[0.14em] text-[var(--intake-teal-dim)]">
                  Current section
                </span>
                <span className="font-intake-body text-sm text-[#1B1E1C]">{activeSection.title}</span>
                {voiceAutofillBusy ? (
                  <span className="font-intake-mono text-[9px] uppercase tracking-[0.14em] text-[var(--intake-teal)] animate-pulse">
                    Structuring transcript...
                  </span>
                ) : voiceFieldSet.size > 0 ? (
                  <span className="font-intake-mono text-[9px] uppercase tracking-[0.14em] text-[var(--intake-teal)]">
                    {voiceFieldSet.size} fields captured
                  </span>
                ) : null}
              </div>
            </div>

            {props.intakeConfig.voice_agent_enabled !== false ? renderVoiceLane() : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="border border-[var(--intake-border)] bg-[var(--intake-cream)] p-4">
            <div className="flex flex-wrap gap-2">
              {INTAKE_SECTIONS.map((section) => {
                const completion = sectionCompletion(section.id);
                const active = section.id === activeSectionId;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-t-2 border-[var(--intake-teal)] bg-[var(--intake-teal-bg)]'
                        : 'border-[var(--intake-border)] bg-white hover:border-[var(--intake-teal)]'
                    }`}
                  >
                    <div className="font-intake-mono text-[8px] uppercase tracking-[0.16em] text-[var(--intake-muted)]">
                      {section.kicker}
                    </div>
                    <div className="mt-1 font-intake-body text-sm text-[#1B1E1C]">{section.title}</div>
                    <div className="mt-1 font-intake-mono text-[8px] uppercase tracking-[0.12em] text-[var(--intake-teal-dim)]">
                      {completion.filled}/{completion.total} ready
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <article
              ref={(node) => {
                sectionRefs.current.positioning = node;
              }}
              className={`border bg-[var(--intake-cream)] p-5 transition-colors ${
                activeSectionId === 'positioning' ? 'border-[var(--intake-teal)] shadow-[0_0_0_1px_rgba(75,158,141,0.16)]' : 'border-[var(--intake-border)]'
              }`}
            >
              <div className="mb-4">
                <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal-dim)]">Act I</div>
                <div className="mt-2 font-intake-body text-2xl font-medium leading-tight text-[#1B1E1C]">Positioning</div>
                <p className="mt-2 max-w-2xl font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
                  Set the direction, target, and compensation posture so the suite knows what game it is optimizing for.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <FieldShell label="What are you aiming at?" helper="Donna should anchor here first when the route feels unclear.">
                  <div className="flex flex-col gap-1.5">
                    {CLIENT_INTENTS.map((option) => {
                      const active = option === intent;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setIntent(option);
                            scrollToSection('positioning');
                          }}
                          className={`border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'border-t-2 border-[var(--intake-teal)] bg-[var(--intake-teal-bg)]'
                              : 'border-[var(--intake-border)] bg-white hover:border-[var(--intake-teal)]'
                          }`}
                        >
                          <div className="font-intake-mono text-[9px] uppercase tracking-[0.1em] text-[var(--intake-muted)]">Intent</div>
                          <div className="mt-1 font-intake-body text-[13px] leading-snug text-[#1B1E1C]">
                            {INTENT_COPY[option].label}
                          </div>
                          <div className="mt-1 font-intake-body text-[11px] leading-relaxed text-[var(--intake-muted)]">
                            {INTENT_COPY[option].description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </FieldShell>

                {isFieldAvailable('outcomes_goals') ? (
                  <FieldShell
                    label="Outcome goals"
                    fieldId="outcomes_goals"
                    voiceFilled={voiceFieldSet.has('outcomes_goals')}
                    ghostFocused={ghostFocusedFieldId === 'outcomes_goals'}
                  >
                    <ChipGroup
                      options={(fieldOptions.get('outcomes_goals') ?? []).map((value) => ({ label: value, value }))}
                      selected={readList('outcomes_goals')}
                      onToggle={(value) => toggleList('outcomes_goals', value)}
                      multi
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('current_or_target_job_title') ? (
                  <FieldShell
                    label="Target job title"
                    fieldId="current_or_target_job_title"
                    voiceFilled={voiceFieldSet.has('current_or_target_job_title') || voiceFieldSet.has('target_title')}
                    ghostFocused={ghostFocusedFieldId === 'current_or_target_job_title'}
                  >
                    <input
                      value={readText('current_or_target_job_title')}
                      onChange={(e) => setText('current_or_target_job_title', e.target.value)}
                      placeholder="e.g., Program Manager"
                      className={inputBaseClass}
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('current_or_target_salary') ? (
                  <FieldShell
                    label="Target salary range"
                    fieldId="current_or_target_salary"
                    voiceFilled={voiceFieldSet.has('current_or_target_salary') || voiceFieldSet.has('comp_range')}
                    ghostFocused={ghostFocusedFieldId === 'current_or_target_salary'}
                  >
                    <input
                      value={readText('current_or_target_salary')}
                      onChange={(e) => setText('current_or_target_salary', e.target.value)}
                      placeholder="e.g., $120k–$160k"
                      className={inputBaseClass}
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('target_compensation_level') ? (
                  <FieldShell
                    label="Comp level"
                    fieldId="target_compensation_level"
                    voiceFilled={voiceFieldSet.has('target_compensation_level') || voiceFieldSet.has('comp_level')}
                    ghostFocused={ghostFocusedFieldId === 'target_compensation_level'}
                  >
                    <select
                      value={readText('target_compensation_level')}
                      onChange={(e) => setText('target_compensation_level', e.target.value)}
                      className={inputBaseClass}
                    >
                      <option value="">Select...</option>
                      {(fieldOptions.get('target_compensation_level') ?? []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </FieldShell>
                ) : null}

                <FieldShell
                  label="Benefits timing"
                  fieldId="benefits_timing"
                  voiceFilled={voiceFieldSet.has('benefits_timing')}
                  ghostFocused={ghostFocusedFieldId === 'benefits_timing'}
                >
                  <ChipGroup
                    options={BENEFITS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                    selected={[readText('benefits_timing') || 'NOT_YET']}
                    onToggle={(value) => {
                      setText('benefits_timing', value);
                      setValue('benefits_under_review', value !== 'NOT_YET');
                    }}
                  />
                </FieldShell>

                <FieldShell
                  label="Suite feel"
                  fieldId="suite_feel"
                  voiceFilled={voiceFieldSet.has('suite_feel') || voiceFieldSet.has('tone_preference')}
                  ghostFocused={ghostFocusedFieldId === 'suite_feel'}
                >
                  <ChipGroup
                    options={SUITE_FEEL_OPTIONS.map((value) => ({ label: value, value }))}
                    selected={readText('suite_feel') ? [readText('suite_feel')] : []}
                    onToggle={(value) => setText('suite_feel', value)}
                  />
                </FieldShell>
              </div>
            </article>

            <article
              ref={(node) => {
                sectionRefs.current.context = node;
              }}
              className={`border bg-[var(--intake-cream)] p-5 transition-colors ${
                activeSectionId === 'context' ? 'border-[var(--intake-teal)] shadow-[0_0_0_1px_rgba(75,158,141,0.16)]' : 'border-[var(--intake-border)]'
              }`}
            >
              <div className="mb-4">
                <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal-dim)]">Act II</div>
                <div className="mt-2 font-intake-body text-2xl font-medium leading-tight text-[#1B1E1C]">Current context</div>
                <p className="mt-2 max-w-2xl font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
                  Give Donna and the suite the environment, tooling posture, and role context they need to stop making generic assumptions.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {isFieldAvailable('current_title') ? (
                  <FieldShell label="Current title" fieldId="current_title" voiceFilled={voiceFieldSet.has('current_title')} ghostFocused={ghostFocusedFieldId === 'current_title'}>
                    <input value={readText('current_title')} onChange={(e) => setText('current_title', e.target.value)} placeholder="e.g., Executive Assistant" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('industry') ? (
                  <FieldShell label="Industry" fieldId="industry" voiceFilled={voiceFieldSet.has('industry')} ghostFocused={ghostFocusedFieldId === 'industry'}>
                    <input value={readText('industry')} onChange={(e) => setText('industry', e.target.value)} placeholder="e.g., Healthcare, SaaS" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('ai_usage_frequency') ? (
                  <FieldShell label="AI usage frequency" fieldId="ai_usage_frequency" voiceFilled={voiceFieldSet.has('ai_usage_frequency')} ghostFocused={ghostFocusedFieldId === 'ai_usage_frequency'}>
                    <ChipGroup
                      options={AI_USAGE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                      selected={readText('ai_usage_frequency') ? [readText('ai_usage_frequency')] : []}
                      onToggle={(value) => setText('ai_usage_frequency', value)}
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('enterprise_context') ? (
                  <FieldShell label="Enterprise AI context" fieldId="enterprise_context" voiceFilled={voiceFieldSet.has('enterprise_context') || voiceFieldSet.has('enterprise_ai_context')} ghostFocused={ghostFocusedFieldId === 'enterprise_context'}>
                    <ChipGroup
                      options={(fieldOptions.get('enterprise_context') ?? []).map((value) => ({ label: value, value }))}
                      selected={readList('enterprise_context')}
                      onToggle={(value) => toggleList('enterprise_context', value)}
                      multi
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('job_description') ? (
                  <FieldShell label="Job description" fieldId="job_description" voiceFilled={voiceFieldSet.has('job_description')} ghostFocused={ghostFocusedFieldId === 'job_description'} helper="Most valuable input. Paste the role, scope, and requirements.">
                    <textarea
                      value={readText('job_description')}
                      onChange={(e) => setText('job_description', e.target.value)}
                      placeholder="Paste current or target job description..."
                      rows={4}
                      className={`${inputBaseClass} resize-y font-intake-body leading-relaxed lg:col-span-2`}
                    />
                  </FieldShell>
                ) : null}
              </div>
            </article>

            <article
              ref={(node) => {
                sectionRefs.current.evidence = node;
              }}
              className={`border bg-[var(--intake-cream)] p-5 transition-colors ${
                activeSectionId === 'evidence' ? 'border-[var(--intake-teal)] shadow-[0_0_0_1px_rgba(75,158,141,0.16)]' : 'border-[var(--intake-border)]'
              }`}
            >
              <div className="mb-4">
                <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal-dim)]">Act III</div>
                <div className="mt-2 font-intake-body text-2xl font-medium leading-tight text-[#1B1E1C]">Proof and inputs</div>
                <p className="mt-2 max-w-2xl font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
                  This is the evidence layer. Bring the strongest material into the system before the suite writes the story for you.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {isFieldAvailable('resume_source') ? (
                  <FieldShell label="Resume link or reference" fieldId="resume_source" voiceFilled={voiceFieldSet.has('resume_source')} ghostFocused={ghostFocusedFieldId === 'resume_source'}>
                    <input value={readText('resume_source')} onChange={(e) => setText('resume_source', e.target.value)} placeholder="URL, file name, or notes" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('bio_alignment_requested') ? (
                  <FieldShell label="Run ALIGN MY BIO after upload" fieldId="bio_alignment_requested" voiceFilled={voiceFieldSet.has('bio_alignment_requested')} ghostFocused={ghostFocusedFieldId === 'bio_alignment_requested'}>
                    <ChipGroup
                      options={[
                        { label: 'Not now', value: 'false' },
                        { label: 'Run it', value: 'true' },
                      ]}
                      selected={[readBool('bio_alignment_requested') ? 'true' : 'false']}
                      onToggle={(value) => setValue('bio_alignment_requested', value === 'true')}
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('foundational_interests') ? (
                  <FieldShell label="Foundational interests" fieldId="foundational_interests" voiceFilled={voiceFieldSet.has('foundational_interests')} ghostFocused={ghostFocusedFieldId === 'foundational_interests'}>
                    <ChipGroup
                      options={(fieldOptions.get('foundational_interests') ?? []).map((value) => ({ label: value, value }))}
                      selected={readList('foundational_interests')}
                      onToggle={(value) => toggleList('foundational_interests', value)}
                      multi
                    />
                  </FieldShell>
                ) : null}

                {!isFreeTier && isFieldAvailable('advanced_interests') ? (
                  <FieldShell label="Advanced interests" fieldId="advanced_interests" voiceFilled={voiceFieldSet.has('advanced_interests')} ghostFocused={ghostFocusedFieldId === 'advanced_interests'}>
                    <ChipGroup
                      options={(fieldOptions.get('advanced_interests') ?? []).map((value) => ({ label: value, value }))}
                      selected={readList('advanced_interests')}
                      onToggle={(value) => toggleList('advanced_interests', value)}
                      multi
                    />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('learning_modalities') ? (
                  <FieldShell label="Learning modalities" fieldId="learning_modalities" voiceFilled={voiceFieldSet.has('learning_modalities')} ghostFocused={ghostFocusedFieldId === 'learning_modalities'}>
                    <ChipGroup
                      options={(fieldOptions.get('learning_modalities') ?? []).map((value) => ({ label: value, value }))}
                      selected={readList('learning_modalities')}
                      onToggle={(value) => toggleList('learning_modalities', value)}
                      multi
                    />
                  </FieldShell>
                ) : null}
              </div>
            </article>

            <article
              ref={(node) => {
                sectionRefs.current.calibration = node;
              }}
              className={`border bg-[var(--intake-cream)] p-5 transition-colors ${
                activeSectionId === 'calibration' ? 'border-[var(--intake-teal)] shadow-[0_0_0_1px_rgba(75,158,141,0.16)]' : 'border-[var(--intake-border)]'
              }`}
            >
              <div className="mb-4">
                <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal-dim)]">Act IV</div>
                <div className="mt-2 font-intake-body text-2xl font-medium leading-tight text-[#1B1E1C]">Calibration</div>
                <p className="mt-2 max-w-2xl font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
                  Finish with direction, friction points, and the operating posture the suite should respect once the live conversation ends.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {isFieldAvailable('target') ? (
                  <FieldShell label="Target direction" fieldId="target" voiceFilled={voiceFieldSet.has('target') || voiceFieldSet.has('direction_aim')} ghostFocused={ghostFocusedFieldId === 'target'}>
                    <input value={readText('target')} onChange={(e) => setText('target', e.target.value)} placeholder="e.g., Program manager" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('pressure_breaks') ? (
                  <FieldShell label="Under pressure, what breaks first?" fieldId="pressure_breaks" voiceFilled={voiceFieldSet.has('pressure_breaks')} ghostFocused={ghostFocusedFieldId === 'pressure_breaks'}>
                    <input value={readText('pressure_breaks')} onChange={(e) => setText('pressure_breaks', e.target.value)} placeholder="Time, clarity, confidence, energy" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('work_style') ? (
                  <FieldShell label="When you need momentum, what helps?" fieldId="work_style" voiceFilled={voiceFieldSet.has('work_style') || voiceFieldSet.has('momentum_source')} ghostFocused={ghostFocusedFieldId === 'work_style'}>
                    <input value={readText('work_style')} onChange={(e) => setText('work_style', e.target.value)} placeholder="A template, a blank page, a conversation" className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                {isFieldAvailable('constraints') ? (
                  <FieldShell label="Constraints to respect" fieldId="constraints" voiceFilled={voiceFieldSet.has('constraints')} ghostFocused={ghostFocusedFieldId === 'constraints'}>
                    <input value={readText('constraints')} onChange={(e) => setText('constraints', e.target.value)} placeholder="Time, location, salary, caregiving..." className={inputBaseClass} />
                  </FieldShell>
                ) : null}

                <FieldShell label="Pace" fieldId="pace" ghostFocused={ghostFocusedFieldId === 'pace'}>
                  <ChipGroup options={PACE_PREFS.map((value) => ({ label: value, value }))} selected={[pace]} onToggle={(value) => setPace(value as PacePreference)} />
                </FieldShell>

                <FieldShell label="Focus" fieldId="focus" ghostFocused={ghostFocusedFieldId === 'focus'}>
                  <ChipGroup options={FOCUS_PREFS.map((value) => ({ label: value, value }))} selected={[focus]} onToggle={(value) => setFocus(value as FocusPreference)} />
                </FieldShell>
              </div>
            </article>

            {renderSubmitCard()}
          </div>
        </section>
      </div>

      {step === 'plating' ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--intake-bg)]/95 backdrop-blur-sm">
          <div className="max-w-lg text-center">
            <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal-dim)]">
              Preparing your suite
            </div>
            <div className="mt-4 font-intake-body text-2xl font-medium leading-snug text-[#1B1E1C]">
              Donna has handed your intake to the suite.
            </div>
            <p className="mt-4 font-intake-body text-sm leading-relaxed text-[var(--intake-muted)]">
              Stay here while the Brief, Profile, Plan, and readiness artifacts are assembled. Jumping ahead before this finishes will leave you in an incomplete state.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {['INTAKE SIGNALS', 'MARKET DATA', 'RESEARCH PASS'].map((label) => (
                <div
                  key={label}
                  className="border border-[var(--intake-border)] bg-[var(--intake-cream)] px-3 py-2 font-intake-mono text-[8px] uppercase tracking-[0.14em] text-[var(--intake-muted)] animate-pulse"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
