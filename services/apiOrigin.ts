const configuredBaseUrl = (import.meta as any).env?.VITE_CONCIERGE_API_URL as string | undefined;
const canonicalFallbackBaseUrl = 'https://career-concierge-api-tpcap5aa5a-ew.a.run.app';
const localDevBaseUrl = 'http://localhost:8080';

const trimTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

const deriveCloudRunSiblingOrigin = () => {
  if (typeof window === 'undefined') return '';

  try {
    const current = new URL(window.location.origin);
    const hostname = current.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return localDevBaseUrl;
    }

    if (hostname.startsWith('career-concierge-suite-') && hostname.endsWith('.run.app')) {
      return `${current.protocol}//${hostname.replace('career-concierge-suite-', 'career-concierge-api-')}`;
    }
  } catch {
    return '';
  }

  return '';
};

export const resolveApiOrigin = () => {
  const value = (configuredBaseUrl || deriveCloudRunSiblingOrigin() || canonicalFallbackBaseUrl).trim();
  return trimTrailingSlash(value);
};
