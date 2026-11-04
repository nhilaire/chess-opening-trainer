// One refresh of the openings from the API: the list, then every detail, with conditional requests. Rules:
// docs/PRD.md "Openings API". The fetcher is injected (HTTP in the app, the mock contract in tests).
import type { Fetcher } from '../api/openingsClient';
import { parseDetail, parseList } from './api';
import type { Opening } from './types';

// What is kept between refreshes, besides the openings: the ETag of each URL and the ids of the last list.
export interface ApiCache {
  etags: Record<string, string>;
  listIds?: string[];
}

export const EMPTY_CACHE: ApiCache = { etags: {} };

export type RefreshResult =
  | { kind: 'updated'; openings: Opening[]; cache: ApiCache; skipped: number }
  | { kind: 'failed' };

export const LIST_PATH = '/api/openings';
export const detailPath = (id: string) => `/api/openings/${encodeURIComponent(id)}`;

export async function refreshOpenings(fetcher: Fetcher, stored: readonly Opening[], cache: ApiCache): Promise<RefreshResult> {
  try {
    const list = await fetcher(LIST_PATH, cache.etags[LIST_PATH]);
    let ids: string[] | null;
    if (list.status === 304) ids = cache.listIds ?? null;
    else if (list.status === 200) ids = parseList(list.json);
    else ids = null;
    if (!ids) return { kind: 'failed' };

    const etags: Record<string, string> = {};
    if (list.etag) etags[LIST_PATH] = list.etag;
    const openings: Opening[] = [];
    let skipped = 0;
    for (const id of ids) {
      const path = detailPath(id);
      const r = await fetcher(path, cache.etags[path]);
      if (r.status === 304) {
        const copy = stored.find((o) => o.origin === 'api' && o.id === id);
        if (!copy) return { kind: 'failed' };
        openings.push(copy);
        if (r.etag ?? cache.etags[path]) etags[path] = (r.etag ?? cache.etags[path])!;
      } else if (r.status === 200) {
        const opening = parseDetail(r.json);
        if (opening && !openings.some((o) => o.id === opening.id)) {
          openings.push(opening);
          if (r.etag) etags[path] = r.etag; // no ETag kept for a skipped opening: it is fetched again next time
        } else skipped++;
      } else return { kind: 'failed' };
    }
    return { kind: 'updated', openings, cache: { etags, listIds: ids }, skipped };
  } catch {
    return { kind: 'failed' }; // network error, timeout, body that is not JSON
  }
}
