import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CLIENT_INTENTS, FOCUS_PREFS, PACE_PREFS, SMART_START_FIELDS, SmartStartField } from '../constants';
import { ClientIntent, ClientPreferences, FocusPreference, IntakeAnswers, PacePreference } from '../types';
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
import { synthesizeConciergeVoice } from '../services/voiceApi';
import { GeminiLivePanel } from './GeminiLivePanel';

type Step = 'intent' | 'concierge' | 'questions' | 'prefs' | 'plating' | 'done';
const SUITE_FEEL_OPTIONS = ['STRATEGIC', 'GROUNDED', 'STORY', 'JOB-SEARCH', 'SKILLS', 'LEADERSHIP'];

export function IntakeFlow(props: {
  uid: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>('intent');
  const [intent, setIntent] = useState<ClientIntent>('current_role');
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [pace, setPace] = useState<PacePreference>('standard');
  const [focus, setFocus] = useState<FocusPreference>('job_search');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastVoiceProvider, setLastVoiceProvider] = useState<'sesame' | 'gemini_live' | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  const prefs: ClientPreferences = useMemo(() => ({ pace, focus }), [pace, focus]);
  const fieldsBySection = useMemo(() => {
    const grouped: Record<string, SmartStartField[]> = {};
    for (const field of SMART_START_FIELDS) {
      if (!grouped[field.section]) grouped[field.section] = [];
      grouped[field.section].push(field);
    }
    return Object.entries(grouped);
  }, []);

  const readText = (id: string) => (typeof answers[id] === 'string' ? (answers[id] as string) : '');
  const readList = (id: string) => (Array.isArray(answers[id]) ? (answers[id] as string[]) : []);
  const readBool = (id: string) => answers[id] === true;
  const setText = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const setBool = (id: string, value: boolean) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const setSingle = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const toggleMulti = (id: string, value: string) =>
    setAnswers((prev) => {
      const existing = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = existing.includes(value)
        ? existing.filter((entry) => entry !== value)
        : [...existing, value];
      return { ...prev, [id]: next };
    });

  const renderSmartStartField = (field: SmartStartField) => {
    if (field.type === 'text') {
      return (
        <input
          value={readText(field.id)}
          onChange={(e) => setText(field.id, e.target.value)}
          placeholder={field.placeholder ?? ''}
          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={readText(field.id)}
          onChange={(e) => setText(field.id, e.target.value)}
          placeholder={field.placeholder ?? ''}
          className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm leading-relaxed bg-white"
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={readText(field.id)}
          onChange={(e) => setSingle(field.id, e.target.value)}
          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={readBool(field.id)}
            onChange={(e) => setBool(field.id, e.target.checked)}
          />
          <span>Yes</span>
        </label>
      );
    }

    if (field.type === 'radio') {
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((option) => {
            const active = readText(field.id) === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSingle(field.id, option)}
                className={`px-3 py-2 text-[11px] uppercase tracking-[0.16em] border transition-colors ${
                  active ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover-border-brand-teal'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((option) => {
          const active = readList(field.id).includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleMulti(field.id, option)}
              className={`px-3 py-2 text-[11px] uppercase tracking-[0.16em] border transition-colors ${
                active ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover-border-brand-teal'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  const buildVoiceScript = () => {
    const currentTitle = readText('current_title') || readText('current_or_target_job_title') || 'your current role';
    const industry = readText('industry') || 'your target industry';
    const target = readText('target') || readText('current_or_target_job_title') || 'your next role';
    const suiteFeel = readText('suite_feel') || 'STRATEGIC';

    if (step === 'intent') {
      return `Welcome. We are here to shape your suite around what matters most to you right now. Choose your direction, and we will build your Brief, Your Suite Distilled, and your 72-hour momentum plan.`;
    }
    if (step === 'concierge') {
      return `Current snapshot: role ${currentTitle}, industry ${industry}, target direction ${target}. Preferred suite feel is ${suiteFeel}. We are building your professional DNA, not collecting generic form data.`;
    }
    if (step === 'questions') {
      return `Complete Smart Start Intake with concise specifics. This single intake powers readiness routing and ConciergeJobSearch execution.`;
    }
    if (step === 'prefs') {
      return `Final tuning before generation. Confirm pace and focus so your outputs land with the right rhythm and decision framing.`;
    }
    return `Preparing your suite.`;
  };

  const playConciergeVoice = async () => {
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      const response = await synthesizeConciergeVoice(buildVoiceScript());
      setLastVoiceProvider(response.provider);
      const mime = response.mime_type || 'audio/wav';
      const dataUrl = `data:${mime};base64,${response.audio_base64}`;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      const audio = new Audio(dataUrl);
      activeAudioRef.current = audio;
      await audio.play();
    } catch (e: any) {
      setVoiceError(e?.message ?? 'Voice playback failed.');
    } finally {
      setVoiceBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveIntake(props.uid, { intent, preferences: prefs, answers });

      // Generate artifacts (stubbed for now; LLM swap is Phase 1).
      setStep('plating');

      // Preferred path: Cloud Run API (stub now, LLM later).
      // Fallback: local stub generator if API isn't configured yet.
      let brief: any, plan: any, profile: any, aiProfile: any, gaps: any;
      try {
        const artifacts = await generateSuiteArtifacts({ intent, preferences: prefs, answers });
        brief = artifacts.brief;
        plan = artifacts.plan;
        profile = artifacts.profile;
        aiProfile = artifacts.ai_profile;
        gaps = artifacts.gaps;
      } catch {
        brief = generateBrief(answers);
        plan = generatePlan(answers);
        profile = generateProfileDoc(answers);
        aiProfile = generateAIProfileDoc(answers);
        gaps = generateGapsDoc(answers);
      }

      await Promise.all([
        upsertArtifact(props.uid, 'brief', 'The Brief', brief),
        upsertArtifact(props.uid, 'suite_distilled', 'Your Suite, Distilled', generateSuiteDistilledDoc(brief, answers)),
        upsertArtifact(props.uid, 'plan', 'Your Plan', plan),
        upsertArtifact(props.uid, 'profile', 'Your Profile', profile),
        upsertArtifact(props.uid, 'ai_profile', 'Your AI Profile', aiProfile),
        upsertArtifact(props.uid, 'gaps', 'Your Gaps', gaps),
        upsertArtifact(props.uid, 'readiness', 'AI Readiness Assessment', generateReadinessDoc(answers)),
        upsertArtifact(props.uid, 'cjs_execution', 'ConciergeJobSearch Execution', generateCjsExecutionDoc(answers)),
      ]);

      setStep('done');
      props.onComplete();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to complete intake.');
      setStep('prefs');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10 max-w-[860px]">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Smart Start Intake</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">A concierge conversation, tailored to you.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-2xl">
          No tests and no scripts. We start by understanding your context so your suite is useful from the first move.
        </p>
      </div>

      {error && (
        <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={playConciergeVoice}
          disabled={voiceBusy || step === 'plating'}
          className="px-4 py-2 border border-brand-teal text-brand-teal text-[10px] uppercase tracking-[0.22em] hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {voiceBusy ? 'Preparing voice preview…' : 'Hear Concierge Preview'}
        </button>
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
          {lastVoiceProvider ? `${lastVoiceProvider} voice route` : 'Configured voice route'}
        </div>
      </div>
      {voiceError && (
        <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
          {voiceError}
        </div>
      )}

      {step === 'intent' && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">What are we optimizing for right now?</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CLIENT_INTENTS.map((i) => {
              const label =
                i === 'current_role'
                  ? 'Stay sharp in my current role'
                  : i === 'target_role'
                  ? 'Move into a specific next role'
                  : 'I’m not sure yet; help me design a direction';
              const active = intent === i;
              return (
                <button
                  key={i}
                  onClick={() => setIntent(i)}
                  className={`text-left p-5 border transition-all dur-md ease-exit ${
                    active ? 'border-brand-teal bg-brand-soft' : 'border-black/10 hover-border-brand-teal'
                  }`}
                >
                  <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Intent</div>
                  <div className="text-lg font-editorial italic leading-tight">{label}</div>
                </button>
              );
            })}
          </div>
          <div className="pt-3">
            <button
              onClick={() => setStep('concierge')}
              className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'concierge' && (
        <div className="space-y-8">
          <GeminiLivePanel />
          <section className="border border-black/10 p-5 bg-gray-50 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Conversation Flow</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-gray-700">
                  What industries are you currently working in? What are you doing right now? Where do you need the most help?
                </label>
                <textarea
                  value={readText('conversation_current_reality')}
                  onChange={(e) => setText('conversation_current_reality', e.target.value)}
                  placeholder="Constraints, timelines, competing priorities."
                  className="w-full min-h-28 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm leading-relaxed bg-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-gray-700">How should this feel?</label>
                <div className="flex flex-wrap gap-2">
                  {SUITE_FEEL_OPTIONS.map((option) => {
                    const active = readText('suite_feel') === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSingle('suite_feel', option)}
                        className={`px-3 py-2 text-[11px] uppercase tracking-[0.16em] border transition-colors ${
                          active
                            ? 'border-brand-teal bg-brand-soft text-brand-teal'
                            : 'border-black/10 hover-border-brand-teal'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 border border-black/5 bg-white p-4">
                <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Suite Preview</div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Preparing your suite with three pillars: <strong>Your Profile</strong>,{' '}
                  <strong>Your AI Profile</strong>, and <strong>Your Gaps</strong>. This confirms the agent is
                  building, not just collecting.
                </p>
              </div>
            </div>
          </section>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep('intent')}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Back
            </button>
            <button
              onClick={() => setStep('questions')}
              className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'questions' && (
        <div className="space-y-6">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">Smart Start intake blueprint</div>
          <div className="space-y-8">
            {fieldsBySection.map(([section, fields]) => (
              <section key={section} className="border border-black/10 p-5 space-y-4 bg-gray-50">
                <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">{section}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className={`flex flex-col gap-2 ${field.type === 'textarea' || field.type === 'multiselect' ? 'md:col-span-2' : ''}`}
                    >
                      <label className="text-xs text-gray-700">{field.label}</label>
                      {renderSmartStartField(field)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep('concierge')}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Back
            </button>
            <button
              onClick={() => setStep('prefs')}
              className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'prefs' && (
        <div className="space-y-8">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Preferences</div>
            <div className="text-xl font-editorial italic">How should this feel?</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Pace</div>
              <div className="flex gap-2 flex-wrap">
                {PACE_PREFS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPace(p)}
                    className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all dur-sm ease-exit ${
                      pace === p ? 'bg-brand-soft text-brand-teal border-brand-teal' : 'border-black/10 hover-border-brand-teal'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Focus</div>
              <div className="flex gap-2 flex-wrap">
                {FOCUS_PREFS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFocus(f)}
                    className={`px-4 py-2 text-xs uppercase tracking-widest border transition-all dur-sm ease-exit ${
                      focus === f ? 'bg-brand-soft text-brand-teal border-brand-teal' : 'border-black/10 hover-border-brand-teal'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep('questions')}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Back
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors disabled:opacity-60"
            >
              {busy ? 'Preparing…' : 'Prepare My Suite'}
            </button>
          </div>

        </div>
      )}

      {step === 'plating' && (
        <div className="pt-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-brand-teal animate-pulse">Plating</div>
          <div className="mt-3 text-2xl font-editorial italic">Preparing your suite…</div>
          <p className="text-sm text-gray-600 leading-relaxed mt-3 max-w-xl">
            This is the intentional pause. We are assembling your Brief, your Plan, and your supporting documents.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['Your Profile', 'Your AI Profile', 'Your Gaps'].map((x) => (
              <div key={x} className="border border-black/5 bg-gray-50 p-4">
                <div className="text-[9px] uppercase tracking-widest opacity-50 mb-2">In progress</div>
                <div className="font-editorial italic text-lg">{x}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
