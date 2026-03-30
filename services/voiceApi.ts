import { auth } from './firebase';
import {
  ElevenLabsSessionResponse,
  IntakeAnswers,
  IntakeTranscriptExtractionResponse,
  VoiceSynthesisResponse,
} from '../types';
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

export const extractIntakeFromTranscript = async (
  transcript: string,
  existingAnswers: IntakeAnswers
): Promise<IntakeTranscriptExtractionResponse> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/intake/extract`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transcript, existing_answers: existingAnswers }),
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${origin}. Start the API server on port 8080 or update VITE_CONCIERGE_API_URL.`
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Transcript extraction error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as IntakeTranscriptExtractionResponse;
};

export const createElevenLabsSession = async (): Promise<ElevenLabsSessionResponse> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/voice/elevenlabs/session`, {
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
    throw new Error(`ElevenLabs session error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as ElevenLabsSessionResponse;
};

export const syncClientGoogleDocs = async (): Promise<Record<string, unknown>> => {
  const origin = resolveApiOrigin();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(`${origin}/v1/gws/sync-docs`, {
      method: 'POST',
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
    throw new Error(`Google Docs sync error (${resp.status}): ${txt || resp.statusText}`);
  }

  return (await resp.json()) as Record<string, unknown>;
};
