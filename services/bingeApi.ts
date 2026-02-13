import { auth } from './firebase';
import { BingeEpisode } from '../types';

const baseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;

export const generateBingeEpisode = async (): Promise<BingeEpisode> => {
  if (!baseUrl) throw new Error('Missing VITE_CONCIERGE_API_URL');
  const origin = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const resp = await fetch(`${origin}/v1/binge/episode`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as BingeEpisode;
};

