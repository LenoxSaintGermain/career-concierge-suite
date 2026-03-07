import { auth } from './firebase';
import { BingeEpisode, CuratedMediaLibraryResponse, GeneratedMediaPack, MediaJourneySurface } from '../types';
import { resolveApiOrigin } from './apiOrigin';

export const generateBingeEpisode = async (targetSkill?: string): Promise<BingeEpisode> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/binge/episode`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(targetSkill ? { target_skill: targetSkill } : {}),
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

  return (await resp.json()) as BingeEpisode;
};

export const generateEpisodeMediaPack = async (episode: BingeEpisode): Promise<GeneratedMediaPack> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/binge/media-pack`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ episode }),
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

  return (await resp.json()) as GeneratedMediaPack;
};

export const refreshVideoOperation = async (
  operationName: string,
  jobId?: string
): Promise<{ done: boolean; video_uri?: string | null; job_id?: string | null }> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/binge/media-pack/video-status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ operation_name: operationName, job_id: jobId }),
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

  const payload = await resp.json();
  return {
    done: Boolean(payload?.done),
    video_uri: payload?.video_uri ?? null,
    job_id: payload?.job_id ?? null,
  };
};

export const fetchCuratedMediaLibrary = async (
  surface: MediaJourneySurface = 'episodes'
): Promise<CuratedMediaLibraryResponse> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/media/library?surface=${encodeURIComponent(surface)}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${origin}. Start the API server on port 8080 or update VITE_CONCIERGE_API_URL.`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Media library error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as CuratedMediaLibraryResponse;
};
