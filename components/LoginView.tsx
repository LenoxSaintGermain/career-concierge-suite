import React, { useMemo, useState } from 'react';
import { loginWithEmailPassword, logout, registerWithEmailPassword } from '../services/authService';
import { resolveApiOrigin } from '../services/apiOrigin';

type Mode = 'login' | 'register';

export function LoginView(props: { onAuthed: () => void; bootstrapError?: string | null }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestCompany, setRequestCompany] = useState('');
  const [requestGoal, setRequestGoal] = useState('');
  const [requestService, setRequestService] = useState('smart_start_booking');
  const [requestResumeLink, setRequestResumeLink] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [requestTimezone, setRequestTimezone] = useState('America/New_York');
  const [requestTiming, setRequestTiming] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'login' ? 'Access Your Suite' : 'Create Your Account'), [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginWithEmailPassword(email, password);
      } else {
        await registerWithEmailPassword(email, password);
      }
      props.onAuthed();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const submitConciergeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestBusy(true);
    setRequestStatus(null);
    try {
      const resp = await fetch(`${resolveApiOrigin()}/v1/public/concierge-request`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          request_kind: 'smart_start_booking',
          name: requestName,
          email: requestEmail,
          company: requestCompany,
          goal: requestGoal,
          service_interest: requestService,
          resume_link: requestResumeLink,
          preferred_date: requestDate,
          preferred_time: requestTime,
          preferred_timezone: requestTimezone,
          preferred_timing: requestTiming,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || resp.statusText);
      }
      setRequestStatus('Smart Start request received. An operator can now review and schedule follow-up.');
      setRequestGoal('');
      setRequestResumeLink('');
      setRequestDate('');
      setRequestTime('');
      setRequestTiming('');
    } catch (err: any) {
      setRequestStatus(err?.message ?? 'Unable to submit concierge request.');
    } finally {
      setRequestBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
        <section className="border border-white/10 bg-[linear-gradient(160deg,rgba(11,11,11,0.98),rgba(7,24,29,0.96))] p-8 shadow-2xl">
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">Third Signal</div>
            <h1 className="mt-3 text-4xl font-editorial italic leading-tight">AI Concierge entry and Smart Start booking.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
              Start as a public concierge lead, request a Smart Start conversation, or sign in if your suite is already active.
            </p>
          </div>

          <form onSubmit={submitConciergeRequest} className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Name</label>
              <input
                type="text"
                required
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Email</label>
              <input
                type="email"
                required
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
                placeholder="you@domain.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Company</label>
              <input
                type="text"
                value={requestCompany}
                onChange={(e) => setRequestCompany(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Service</label>
              <select
                value={requestService}
                onChange={(e) => setRequestService(e.target.value)}
                className="border-b border-white/20 bg-transparent py-2 text-sm tracking-wide outline-none"
              >
                <option value="smart_start_booking" className="bg-[#0b0b0b]">Smart Start session</option>
                <option value="public_ai_concierge" className="bg-[#0b0b0b]">AI Concierge guidance</option>
                <option value="cjs_premier" className="bg-[#0b0b0b]">Concierge Job Search</option>
                <option value="not_sure" className="bg-[#0b0b0b]">Not sure yet</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Resume Link</label>
              <input
                type="url"
                value={requestResumeLink}
                onChange={(e) => setRequestResumeLink(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
                placeholder="Optional URL to resume or portfolio"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Preferred Date</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Preferred Time</label>
              <input
                type="time"
                value={requestTime}
                onChange={(e) => setRequestTime(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Timezone</label>
              <select
                value={requestTimezone}
                onChange={(e) => setRequestTimezone(e.target.value)}
                className="border-b border-white/20 bg-transparent py-2 text-sm tracking-wide outline-none"
              >
                <option value="America/New_York" className="bg-[#0b0b0b]">Eastern</option>
                <option value="America/Chicago" className="bg-[#0b0b0b]">Central</option>
                <option value="America/Denver" className="bg-[#0b0b0b]">Mountain</option>
                <option value="America/Los_Angeles" className="bg-[#0b0b0b]">Pacific</option>
                <option value="UTC" className="bg-[#0b0b0b]">UTC</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Fallback Timing Note</label>
              <input
                type="text"
                value={requestTiming}
                onChange={(e) => setRequestTiming(e.target.value)}
                className="bg-transparent border-b border-white/20 outline-none py-2 text-sm tracking-wide"
                placeholder="Optional backup note if your schedule is flexible"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">What do you need help with?</label>
              <textarea
                required
                value={requestGoal}
                onChange={(e) => setRequestGoal(e.target.value)}
                className="min-h-28 border border-white/12 bg-black/20 p-3 text-sm leading-relaxed outline-none"
                placeholder="Tell us whether you need direction, job-search support, AI readiness guidance, or a Smart Start session."
              />
            </div>

            {requestStatus ? (
              <div className="md:col-span-2 border border-white/12 bg-white/5 px-4 py-3 text-xs leading-relaxed text-white/75">
                {requestStatus}
              </div>
            ) : null}

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={requestBusy}
                className="btn-brand px-5 py-3 text-xs font-bold uppercase tracking-[0.25em] disabled:opacity-60"
              >
                {requestBusy ? 'Submitting…' : 'Request Smart Start'}
              </button>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Operator-visible booking intake
              </div>
            </div>
          </form>
        </section>

        <div className="border border-white/15 bg-[#0b0b0b] p-8 shadow-2xl">
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">Client Access</div>
            <h2 className="text-2xl font-editorial italic mt-2">{title}</h2>
            <p className="text-xs opacity-60 mt-3 leading-relaxed">
              This is a private concierge suite for clients. If you don’t have access, use the Smart Start request form.
            </p>
          </div>

          {(props.bootstrapError || error) && (
            <div className="mb-6 border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
              {props.bootstrapError || error}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-b border-white/20 focus-border-brand-teal outline-none py-2 text-sm tracking-wide"
                placeholder="you@domain.com"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest opacity-50">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-b border-white/20 focus-border-brand-teal outline-none py-2 text-sm tracking-wide"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-brand py-3 text-xs font-bold uppercase tracking-[0.25em] transition-colors disabled:opacity-60"
            >
              {busy ? 'Working…' : mode === 'login' ? 'Enter' : 'Create'}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
              >
                {mode === 'login' ? 'Need an account?' : 'Have an account?'}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
              >
                Sign out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
