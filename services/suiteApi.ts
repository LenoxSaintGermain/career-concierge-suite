import { auth } from './firebase';
import { BriefContent, ClientIntent, ClientPreferences, IntakeAnswers, PlanContent } from '../types';

export type SuiteArtifacts = {
  brief: BriefContent;
  plan: PlanContent;
  profile: unknown;
  ai_profile: unknown;
  gaps: unknown;
};

const baseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;

export const generateSuiteArtifacts = async (payload: {
  intent: ClientIntent;
  preferences: ClientPreferences;
  answers: IntakeAnswers;
}): Promise<SuiteArtifacts> => {
  if (!baseUrl) throw new Error('Missing VITE_CONCIERGE_API_URL');
  const origin = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const resp = await fetch(`${origin}/v1/suite/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return data.artifacts as SuiteArtifacts;
};
