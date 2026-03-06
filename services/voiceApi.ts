import { auth } from './firebase';
import { VoiceSynthesisResponse } from '../types';
import { resolveApiOrigin } from './apiOrigin';

export const synthesizeConciergeVoice = async (text: string): Promise<VoiceSynthesisResponse> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/voice/synthesize`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${origin}. Start the API server on port 8080 or update VITE_CONCIERGE_API_URL.`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Voice API error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as VoiceSynthesisResponse;
};
