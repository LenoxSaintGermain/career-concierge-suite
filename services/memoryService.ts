import { auth } from './firebase';
import { ClientMemory, MessageRecord } from '../types';
import { resolveApiOrigin } from './apiOrigin';

export const writeSessionMessage = async (
  sessionId: string,
  message: MessageRecord
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(`${resolveApiOrigin()}/v1/memory/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(message),
  }).catch(() => {});
};

export const endSession = async (sessionId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(`${resolveApiOrigin()}/v1/memory/session/${sessionId}/end`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => {});
};

export const fetchClientMemory = async (): Promise<ClientMemory | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const resp = await fetch(`${resolveApiOrigin()}/v1/memory/context`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as ClientMemory;
};
