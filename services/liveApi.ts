import { auth } from './firebase';
import { GeminiLiveTokenResponse } from '../types';

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-pplaphmpxq-uw.a.run.app';

const resolveBaseUrl = () => {
  const source = (configuredBaseUrl || defaultBaseUrl).trim();
  return source.endsWith('/') ? source.slice(0, -1) : source;
};

export const createGeminiLiveToken = async (): Promise<GeminiLiveTokenResponse> => {
  const origin = resolveBaseUrl();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/live/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${origin}. Start the API server on port 8080 or update VITE_CONCIERGE_API_URL.`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Live token error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as GeminiLiveTokenResponse;
};
