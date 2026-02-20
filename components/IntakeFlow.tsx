import React, { useMemo, useState } from 'react';
import { CLIENT_INTENTS, FOCUS_PREFS, INTAKE_PROMPTS, PACE_PREFS } from '../constants';
import { ClientIntent, ClientPreferences, FocusPreference, IntakeAnswers, PacePreference } from '../types';
import { saveIntake } from '../services/clientService';
import { upsertArtifact } from '../services/artifactService';
import {
  generateAIProfileDoc,
  generateBrief,
  generateGapsDoc,
  generatePlan,
  generateProfileDoc,
} from '../services/stubGenerator';
import { generateSuiteArtifacts } from '../services/suiteApi';

type Step = 'intent' | 'questions' | 'prefs' | 'plating' | 'done';

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

  const prefs: ClientPreferences = useMemo(() => ({ pace, focus }), [pace, focus]);

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
        upsertArtifact(props.uid, 'plan', 'Your Plan', plan),
        upsertArtifact(props.uid, 'profile', 'Your Profile', profile),
        upsertArtifact(props.uid, 'ai_profile', 'Your AI Profile', aiProfile),
        upsertArtifact(props.uid, 'gaps', 'Your Gaps', gaps),
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
    <div className="space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Intake</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">A short concierge conversation.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-2xl">
          You’re not taking a test. We’re calibrating your suite so the outputs are useful immediately.
        </p>
      </div>

      {error && (
        <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
          {error}
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
                    active ? 'border-black bg-gray-50' : 'border-black/10 hover:border-black/30'
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
              onClick={() => setStep('questions')}
              className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'questions' && (
        <div className="space-y-6">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">A few calibration prompts</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {INTAKE_PROMPTS.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <label className="text-xs text-gray-700">{p.label}</label>
                <input
                  value={answers[p.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={p.placeholder ?? ''}
                  className="border-b border-black/10 focus:border-black outline-none py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep('intent')}
              className="text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Back
            </button>
            <button
              onClick={() => setStep('prefs')}
              className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
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
                      pace === p ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black/30'
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
                      focus === f ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black/30'
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
              className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors disabled:opacity-60"
            >
              {busy ? 'Preparing…' : 'Prepare My Suite'}
            </button>
          </div>

        </div>
      )}

      {step === 'plating' && (
        <div className="pt-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400 animate-pulse">Plating</div>
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
