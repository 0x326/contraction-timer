const DEFAULT_BACKEND_URL = 'http://localhost:3001';

function normalizeBaseUrl(url: string): string {
  if (!url) {
    return DEFAULT_BACKEND_URL;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

const baseUrl = normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL ?? DEFAULT_BACKEND_URL);

export const BACKEND_SERVER_URL = baseUrl;

export function buildBackendUrl(path: string): string {
  if (!path) {
    return baseUrl;
  }
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${sanitizedPath}`;
}
