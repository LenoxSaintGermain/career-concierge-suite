import { auth } from './firebase';
import { BriefContent, ClientIntent, ClientPreferences, IntakeAnswers, PlanContent } from '../types';

export type SuiteArtifacts = {
  brief: BriefContent;
  plan: PlanContent;
  profile: unknown;
  ai_profile: unknown;
  gaps: unknown;
};

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-tpcap5aa5a-ew.a.run.app';

export const generateSuiteArtifacts = async (payload: {
  intent: ClientIntent;
  preferences: ClientPreferences;
  answers: IntakeAnswers;
}): Promise<SuiteArtifacts> => {
  const source = (configuredBaseUrl || defaultBaseUrl).trim();
  const origin = source.endsWith('/') ? source.slice(0, -1) : source;
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/suite/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${origin}. Start the API server on port 8080 or update VITE_CONCIERGE_API_URL.`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return data.artifacts as SuiteArtifacts;
};
