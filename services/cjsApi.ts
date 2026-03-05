import { auth } from './firebase';
import { AgentDefinition, CjsAsset, InteractionLog, ResumeReviewContent, SearchStrategyContent } from '../types';

const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const defaultBaseUrl = 'https://career-concierge-api-tpcap5aa5a-ew.a.run.app';

const resolveBaseUrl = () => {
  const source = (configuredBaseUrl || defaultBaseUrl).trim();
  return source.endsWith('/') ? source.slice(0, -1) : source;
};

const authHeaders = async (contentType = 'application/json') => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'content-type': contentType,
    authorization: `Bearer ${token}`,
  };
};

const readError = async (resp: Response, prefix: string) => {
  const txt = await resp.text().catch(() => '');
  throw new Error(`${prefix} (${resp.status}): ${txt || resp.statusText}`);
};

export const listCjsAssets = async (): Promise<CjsAsset[]> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/cjs/assets`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!resp.ok) return readError(resp, 'CJS assets error');
  const payload = await resp.json();
  return Array.isArray(payload?.items) ? (payload.items as CjsAsset[]) : [];
};

export const uploadResumeAsset = async (payload: {
  filename: string;
  mime_type: string;
  content_base64?: string;
  source_url?: string;
  label?: string;
  target_role?: string;
  notes?: string;
}): Promise<CjsAsset> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/cjs/resume/upload`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) return readError(resp, 'Resume upload error');
  const body = await resp.json();
  return body?.item as CjsAsset;
};

export const generateResumeReview = async (): Promise<{ review: ResumeReviewContent; interaction_id: string | null }> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/cjs/resume/review`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  if (!resp.ok) return readError(resp, 'Resume review error');
  const body = await resp.json();
  return {
    review: body?.review as ResumeReviewContent,
    interaction_id: body?.interaction_id ?? null,
  };
};

export const generateSearchStrategy = async (): Promise<{ strategy: SearchStrategyContent; interaction_id: string | null }> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/cjs/search/strategy`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  if (!resp.ok) return readError(resp, 'Search strategy error');
  const body = await resp.json();
  return {
    strategy: body?.strategy as SearchStrategyContent,
    interaction_id: body?.interaction_id ?? null,
  };
};

export const listInteractionLogs = async (): Promise<InteractionLog[]> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/interactions`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!resp.ok) return readError(resp, 'Interactions error');
  const body = await resp.json();
  return Array.isArray(body?.items) ? (body.items as InteractionLog[]) : [];
};

export const generateChiefOfStaffSummary = async (
  mode: 'logged' | 'pending_approval' = 'pending_approval'
): Promise<InteractionLog> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/interactions/chief-of-staff`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ mode }),
  });
  if (!resp.ok) return readError(resp, 'Chief of Staff summary error');
  const body = await resp.json();
  return body?.item as InteractionLog;
};

export const decideInteractionLog = async (
  interactionId: string,
  decision: 'approved' | 'rejected',
  note: string
): Promise<InteractionLog> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/interactions/${encodeURIComponent(interactionId)}/decision`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ decision, note }),
  });
  if (!resp.ok) return readError(resp, 'Interaction decision error');
  const body = await resp.json();
  return body?.item as InteractionLog;
};

export const fetchAgentRegistry = async (): Promise<AgentDefinition[]> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/agents/registry`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!resp.ok) return readError(resp, 'Agent registry error');
  const body = await resp.json();
  return Array.isArray(body?.agents) ? (body.agents as AgentDefinition[]) : [];
};

export const listAdminApprovalQueue = async (): Promise<InteractionLog[]> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(`${origin}/v1/admin/approval-queue`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!resp.ok) return readError(resp, 'Approval queue error');
  const body = await resp.json();
  return Array.isArray(body?.items) ? (body.items as InteractionLog[]) : [];
};

export const decideAdminApproval = async (
  clientUid: string,
  interactionId: string,
  decision: 'approved' | 'rejected',
  note: string
): Promise<InteractionLog> => {
  const origin = resolveBaseUrl();
  const resp = await fetch(
    `${origin}/v1/admin/approval-queue/${encodeURIComponent(clientUid)}/${encodeURIComponent(interactionId)}/decision`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ decision, note }),
    }
  );
  if (!resp.ok) return readError(resp, 'Admin approval decision error');
  const body = await resp.json();
  return body?.item as InteractionLog;
};
