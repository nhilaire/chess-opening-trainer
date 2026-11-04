import { ApiResponse, Fetcher, httpFetcher, TIMEOUT_MS } from '../api/openingsClient';
import { createEmbeddedOpenings } from '../game/embedded';
import { ApiCache, EMPTY_CACHE, refreshOpenings } from '../game/refresh';
import { extractLines } from '../game/repertoire';

// The mock API's contract is the fake backend (same code as the emulator scenarios).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const contract = require('../../mock-api/contract.cjs');
const v1 = require('../../mock-api/scenarios/repertoire-v1.json');
const v2 = require('../../mock-api/scenarios/repertoire-v2.json');

type Call = { path: string; etag?: string };

function contractFetcher(calls: Call[] = []): Fetcher {
  return async (path, etag) => {
    calls.push({ path, etag });
    const r = contract.handle({ method: 'GET', path, headers: etag ? { 'if-none-match': etag } : {} });
    if (!r) return { status: 404 };
    return { status: r.status ?? 200, etag: r.headers?.ETag, json: r.body === undefined ? undefined : JSON.parse(JSON.stringify(r.body)) };
  };
}

beforeEach(() => {
  contract.reset();
  contract.load(v1);
});

describe('refresh success (AC-40)', () => {
  it('replaces the stored openings by the API ones in list order and stores the ETags', async () => {
    const result = await refreshOpenings(contractFetcher(), createEmbeddedOpenings(), EMPTY_CACHE);
    expect(result.kind).toBe('updated');
    if (result.kind !== 'updated') return;
    expect(result.openings.map((o) => [o.id, o.name, o.color, o.origin])).toEqual([
      ['test-italienne', 'Italienne test', 'white', 'api'],
      ['test-francaise', 'Française test', 'black', 'api'],
    ]);
    expect(result.openings.map((o) => extractLines(o).length)).toEqual([3, 2]);
    expect(Object.keys(result.cache.etags).sort()).toEqual(['/api/openings', '/api/openings/test-francaise', '/api/openings/test-italienne']);
    expect(result.cache.listIds).toEqual(['test-italienne', 'test-francaise']);
    expect(result.skipped).toBe(0);
  });

  it('sends the stored ETags and keeps the stored copies on 304', async () => {
    const first = await refreshOpenings(contractFetcher(), [], EMPTY_CACHE);
    if (first.kind !== 'updated') throw new Error('first refresh failed');
    const calls: Call[] = [];
    const second = await refreshOpenings(contractFetcher(calls), first.openings, first.cache);
    expect(calls.every((c) => c.etag === first.cache.etags[c.path])).toBe(true);
    expect(second).toEqual({ kind: 'updated', openings: first.openings, cache: first.cache, skipped: 0 });
  });

  it('follows a changed repertoire: opening added, one removed, a line added', async () => {
    const first = await refreshOpenings(contractFetcher(), [], EMPTY_CACHE);
    if (first.kind !== 'updated') throw new Error('first refresh failed');
    contract.load(v2);
    const second = await refreshOpenings(contractFetcher(), first.openings, first.cache);
    if (second.kind !== 'updated') throw new Error('second refresh failed');
    expect(second.openings.map((o) => o.id)).toEqual(['test-italienne', 'test-caro']);
    expect(extractLines(second.openings[0]).length).toBe(4);
  });

  it('skips an invalid opening and keeps the others; it is fetched again without ETag next time', async () => {
    contract.commands.put({ opening: { id: 'test-bad', name: 'Bad', playerColor: 'white', tree: [{ move: 'e5' }] } });
    const result = await refreshOpenings(contractFetcher(), [], EMPTY_CACHE);
    if (result.kind !== 'updated') throw new Error('refresh failed');
    expect(result.openings.map((o) => o.id)).toEqual(['test-italienne', 'test-francaise']);
    expect(result.skipped).toBe(1);
    expect(result.cache.etags['/api/openings/test-bad']).toBeUndefined();
  });

  it('stores an empty list when the API has no opening (AC-36)', async () => {
    contract.reset();
    const result = await refreshOpenings(contractFetcher(), createEmbeddedOpenings(), EMPTY_CACHE);
    expect(result).toMatchObject({ kind: 'updated', openings: [] });
  });
});

describe('refresh failure keeps everything (AC-41)', () => {
  const failing = (fail: (path: string) => ApiResponse | Error | undefined): Fetcher => {
    const ok = contractFetcher();
    return async (path, etag) => {
      const f = fail(path);
      if (f instanceof Error) throw f;
      return f ?? ok(path, etag);
    };
  };

  it.each([
    ['a network error', (p: string) => (p === '/api/openings' ? new Error('Network request failed') : undefined)],
    ['a timeout on a detail', (p: string) => (p.endsWith('francaise') ? new Error('Aborted') : undefined)],
    ['a 500 on the list', (p: string) => (p === '/api/openings' ? { status: 500 } : undefined)],
    ['a 500 on a detail', (p: string) => (p.endsWith('italienne') ? { status: 500 } : undefined)],
    ['a list that is not an array', (p: string) => (p === '/api/openings' ? { status: 200, json: { items: [] } } : undefined)],
  ])('fails on %s', async (_name, fail) => {
    expect(await refreshOpenings(failing(fail), createEmbeddedOpenings(), EMPTY_CACHE)).toEqual({ kind: 'failed' });
  });

  it('fails on a 304 without stored copy', async () => {
    const first = await refreshOpenings(contractFetcher(), [], EMPTY_CACHE);
    if (first.kind !== 'updated') throw new Error('first refresh failed');
    const cache: ApiCache = first.cache;
    expect(await refreshOpenings(contractFetcher(), createEmbeddedOpenings(), cache)).toEqual({ kind: 'failed' });
  });
});

describe('HTTP client (AC-42)', () => {
  function fakeFetch(status: number, body: string, etag?: string) {
    return jest.fn(async (_url: string, _init: RequestInit) => ({
      status,
      headers: { get: (h: string) => (h === 'ETag' ? etag ?? null : null) },
      text: async () => body,
    })) as unknown as jest.Mock & typeof fetch;
  }

  it('sends a GET with If-None-Match only, and reads the ETag and the JSON', async () => {
    const fetchImpl = fakeFetch(200, '[{"id":"a"}]', '"e1"');
    const r = await httpFetcher('https://example.invalid/', fetchImpl)('/api/openings', '"e0"');
    expect(r).toEqual({ status: 200, etag: '"e1"', json: [{ id: 'a' }] });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://example.invalid/api/openings');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Accept: 'application/json', 'If-None-Match': '"e0"' });
  });

  it('returns a 304 without body, throws on a body that is not JSON', async () => {
    expect(await httpFetcher('https://example.invalid', fakeFetch(304, ''))('/api/openings')).toEqual({ status: 304, etag: undefined });
    await expect(httpFetcher('https://example.invalid', fakeFetch(200, '<html>'))('/api/openings')).rejects.toThrow();
  });

  it('aborts a request after 45 s', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('Aborted')))),
    ) as unknown as typeof fetch;
    const pending = httpFetcher('https://example.invalid', fetchImpl)('/api/openings');
    expect(TIMEOUT_MS).toBe(45_000);
    jest.advanceTimersByTime(44_999);
    jest.advanceTimersByTime(1);
    await expect(pending).rejects.toThrow('Aborted');
    jest.useRealTimers();
  });
});
