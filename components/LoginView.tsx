import React, { useMemo, useState } from 'react';
import { loginWithEmailPassword, logout, registerWithEmailPassword } from '../services/authService';

type Mode = 'login' | 'register';

export function LoginView(props: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-white/15 bg-[#0b0b0b] p-8 shadow-2xl">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">Third Signal</div>
          <h1 className="text-2xl font-editorial italic mt-2">{title}</h1>
          <p className="text-xs opacity-60 mt-3 leading-relaxed">
            This is a private concierge suite for clients. If you don’t have access, contact your concierge.
          </p>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
            {error}
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
            {/* Useful during dev when auth state gets stuck */}
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
  );
}
