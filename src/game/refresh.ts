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

// A 304 is only useful with something stored to keep. When the list ids or the copy of an opening are missing, the
// same URL is asked once more without If-None-Match: otherwise the same ETag would be sent, and fail, forever.
export async function refreshOpenings(fetcher: Fetcher, stored: readonly Opening[], cache: ApiCache): Promise<RefreshResult> {
  try {
    let list = await fetcher(LIST_PATH, cache.etags[LIST_PATH]);
    if (list.status === 304 && !cache.listIds) list = await fetcher(LIST_PATH);
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
      const copy = stored.find((o) => o.origin === 'api' && o.id === id);
      let r = await fetcher(path, cache.etags[path]);
      if (r.status === 304 && !copy) r = await fetcher(path);
      if (r.status === 304) {
        if (!copy) return { kind: 'failed' };
        if (!openings.some((o) => o.id === copy.id)) {
          openings.push(copy);
          const etag = r.etag ?? cache.etags[path];
          if (etag) etags[path] = etag;
        } else skipped++;
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
