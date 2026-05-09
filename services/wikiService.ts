import { auth } from './firebase';
import { ClientWiki } from '../types';
import { resolveApiOrigin } from './apiOrigin';

export const fetchClientWiki = async (): Promise<ClientWiki | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();

  const resp = await fetch(`${resolveApiOrigin()}/v1/wiki/context`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as ClientWiki;
};

export const compileClientWiki = async (): Promise<ClientWiki | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();

  const resp = await fetch(`${resolveApiOrigin()}/v1/wiki/compile`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.wiki as ClientWiki;
};
