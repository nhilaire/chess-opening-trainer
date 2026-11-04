// The app's backend contract, as the mock API plays it. Replace this example with the real routes of the app
// (same paths, status codes and JSON shapes as the backend), and keep it pure: no network, no file, no clock.
// The contract test (factory-app.json e2e.contract) replays the same scenarios against the real backend.
//
//   reset()            empty state
//   load(scenario)     put a scenario's data in place (mock-api/scenarios/<name>.json, fake data only)
//   handle(req)        { method, path, query: URLSearchParams, body } -> { status?, body } | undefined (404)
//   state()            server-side truth, read by flows and tests to check what the app sent
//   commands           app-specific control actions, POST /__cmd/<name> (e.g. an edit made on the website)

let items = new Map();

export default {
  reset() {
    items = new Map();
  },

  load(scenario) {
    for (const item of scenario.items || []) items.set(item.id, { ...item });
  },

  handle({ method, path, body }) {
    if (method === 'GET' && path === '/api/ping') return { body: 'pong' };
    if (method === 'GET' && path === '/api/items') return { body: [...items.values()] };
    if (method === 'POST' && path === '/api/items') {
      if (!body?.id) return { status: 400, body: { error: 'id required' } };
      items.set(body.id, { ...body });
      return { status: 201, body };
    }
    return undefined;
  },

  state() {
    return { items: [...items.values()] };
  },

  commands: {
    rename({ id, label }) {
      const item = items.get(id);
      if (!item) throw new Error(`no item ${id}`);
      item.label = label;
      return { ok: true };
    },
  },
};
