// The openings API as the mock plays it (read-only, GET only, ETag / If-None-Match -> 304). Same paths, statuses and
// JSON shapes as the user's real API (docs/PRD.md "Openings API"); fake repertoires only (mock-api/scenarios/).
// Pure: no network, no file, no clock. CommonJS so that Jest loads it without a transform (src/__tests__ use it as
// the fake backend of the app's refresh).
//
//   reset()            no opening
//   load(scenario)     { openings: [detail, ...] } in list order
//   handle(req)        { method, path, headers } -> { status?, body?, headers? } | undefined (404)
//   state()            the openings served
//   commands           put {opening} (add or replace, kept in place), remove {id}

let openings = [];

// Weak ETag of a JSON value (djb2 over its text): changes whenever the content changes.
function etagOf(value) {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `"${h.toString(16)}"`;
}

function countLines(nodes) {
  return (nodes || []).reduce((n, node) => n + (node.children && node.children.length ? countLines(node.children) : 1), 0);
}

function summary(o) {
  return {
    id: o.id,
    name: o.name,
    playerColor: o.playerColor,
    firstMove: o.tree && o.tree[0] ? o.tree[0].move : null,
    description: o.description || '',
    variantCount: (o.variants || []).length,
    lineCount: countLines(o.tree),
    updatedAt: o.updatedAt || '2026-01-01T00:00:00+00:00',
  };
}

function withEtag(body, headers) {
  const etag = etagOf(body);
  const sent = headers && (headers['if-none-match'] || headers['If-None-Match']);
  if (sent === etag) return { status: 304, headers: { ETag: etag } };
  return { status: 200, body, headers: { ETag: etag } };
}

module.exports = {
  reset() {
    openings = [];
  },

  load(scenario) {
    openings = (scenario.openings || []).map((o) => JSON.parse(JSON.stringify(o)));
  },

  handle({ method, path, headers }) {
    if (method !== 'GET') return { status: 405, body: { error: 'read-only API' } };
    if (path === '/api/openings') return withEtag(openings.map(summary), headers);
    const m = /^\/api\/openings\/([^/]+)$/.exec(path);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const o = openings.find((x) => x.id === id);
      return o ? withEtag(o, headers) : { status: 404, body: { error: `no opening ${id}` } };
    }
    return undefined;
  },

  state() {
    return { openings: openings.map(summary) };
  },

  commands: {
    put({ opening }) {
      if (!opening || !opening.id) throw new Error('opening with an id required');
      const i = openings.findIndex((o) => o.id === opening.id);
      if (i >= 0) openings[i] = opening;
      else openings.push(opening);
      return { ok: true, count: openings.length };
    },
    remove({ id }) {
      openings = openings.filter((o) => o.id !== id);
      return { ok: true, count: openings.length };
    },
  },
};
