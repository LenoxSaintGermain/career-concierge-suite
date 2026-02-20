import { auth } from './firebase';
import { AppConfig, PublicConfig } from '../types';

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-pplaphmpxq-uw.a.run.app';

const resolveBaseUrl = () => {
  const value = (configuredBaseUrl || defaultBaseUrl).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const authHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
};

export const fetchPublicConfig = async (): Promise<PublicConfig> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/public/config`);
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Public config error (${resp.status}): ${txt || resp.statusText}`);
  }
  const data = await resp.json();
  return data.config as PublicConfig;
};

export const fetchAdminConfig = async (): Promise<AppConfig> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/config`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Admin config error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return data.config as AppConfig;
};

export const saveAdminConfig = async (config: AppConfig): Promise<AppConfig> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/config`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ config }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Save config error (${resp.status}): ${txt || resp.statusText}`);
  }

  const data = await resp.json();
  return data.config as AppConfig;
};
