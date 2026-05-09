import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { User } from 'firebase/auth';
import { loginWithEmailPassword, registerWithEmailPassword } from '../services/authService';
import { markIntroSeen, saveIntake } from '../services/clientService';
import { compileClientWiki } from '../services/wikiService';
import type { ClientIntent, ClientPreferences, IntakeAnswers } from '../types';

const DONNA_SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 } as const;

interface AuthCardProps {
  mode: 'login' | 'register';
  onSuccess: (user: User) => void;
  onDismiss: () => void;
  onToggleMode: () => void;
  registrationSeed?: {
    intent: ClientIntent;
    preferences: ClientPreferences;
    answers: IntakeAnswers;
  } | null;
}

const normalizeAuthError = (error: any, mode: 'login' | 'register') => {
  const code = String(error?.code || '').trim();
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'That email and password combination did not match our records. Check the credentials and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account is currently disabled. Contact an operator for access.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many sign-in attempts were made. Wait a moment, then try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'That email is already registered. Sign in instead, or use a different address.';
  }
  if (code === 'auth/weak-password' && mode === 'register') {
    return 'Choose a stronger password to create the account.';
  }
  return error?.message ?? (mode === 'login' ? 'Unable to sign in.' : 'Unable to create the account.');
};

export function AuthCard({
  mode,
  onSuccess,
  onDismiss,
  onToggleMode,
  registrationSeed = null,
}: AuthCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let user: User;
      if (mode === 'login') {
        user = await loginWithEmailPassword(email, password);
      } else {
        user = await registerWithEmailPassword(email, password);
        if (registrationSeed) {
          await saveIntake(user.uid, registrationSeed);
          await compileClientWiki().catch(() => null);
          await markIntroSeen(user.uid).catch(() => undefined);
        }
      }
      onSuccess(user);
    } catch (nextError: any) {
      setError(normalizeAuthError(nextError, mode));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={DONNA_SPRING}
      className="w-full max-w-[360px] border px-5 py-5"
      style={{ backgroundColor: '#0D2329', borderColor: '#22424A' }}
    >
      <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
        {mode === 'login' ? 'ACCOUNT ACCESS' : 'CREATE ACCESS'}
      </div>
      <div className="mt-2 font-editorial text-2xl italic text-[#DCE7E8]">
        {mode === 'login' ? 'Sign in.' : 'Join the line.'}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7]">
            Email
          </div>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full border-b bg-transparent py-2 text-sm text-[#DCE7E8] outline-none"
            style={{ borderColor: '#22424A' }}
          />
        </label>
        <label className="block">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7]">
            Password
          </div>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border-b bg-transparent py-2 text-sm text-[#DCE7E8] outline-none"
            style={{ borderColor: '#22424A' }}
          />
        </label>
        {error ? (
          <div className="border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="border px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] transition-colors disabled:opacity-55"
          style={{
            borderColor: '#8DD9BF',
            backgroundColor: 'rgba(141,217,191,0.14)',
            color: '#DCE7E8',
          }}
        >
          {busy ? (mode === 'login' ? 'Signing In…' : 'Creating…') : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleMode}
          className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7]"
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7]"
        >
          Dismiss ×
        </button>
      </div>
    </motion.div>
  );
}
