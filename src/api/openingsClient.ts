// HTTP access to the openings API: GET only, no identifier, 45 s timeout, conditional requests with the stored
// ETag. Rules: docs/PRD.md "Openings API". The base URL comes from src/config/env (private config in prod).
export interface ApiResponse {
  status: number; // 200, 304, other statuses as received
  etag?: string;
  json?: unknown; // the parsed body of a 200
}

// `path` starts with "/api/"; throws on a network error, a timeout or a 200 whose body is not JSON.
export type Fetcher = (path: string, etag?: string) => Promise<ApiResponse>;

export const TIMEOUT_MS = 45_000; // the free server may take 10-30 s to wake up

export function httpFetcher(baseUrl: string, fetchImpl: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Fetcher {
  const base = baseUrl.replace(/\/+$/, '');
  return async (path, etag) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (etag) headers['If-None-Match'] = etag;
      const res = await fetchImpl(`${base}${path}`, { method: 'GET', headers, signal: controller.signal });
      const tag = res.headers.get('ETag') ?? undefined;
      if (res.status !== 200) return { status: res.status, etag: tag };
      return { status: 200, etag: tag, json: JSON.parse(await res.text()) };
    } finally {
      clearTimeout(timer);
    }
  };
}
