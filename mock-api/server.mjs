#!/usr/bin/env node
// Mock API for end-to-end scenarios (factory template, no dependency). The app's backend contract lives in
// ./contract.mjs; this file adds the control endpoints that scenarios use to set the world up and check it.
//
//   node mock-api/server.mjs [--port 8787]
//
// The e2e APK reaches it as http://localhost:<port> through `adb reverse` (verify.mjs does it). Never deploy it.
//
// Control endpoints (never reached by the app, only by Maestro flows through .maestro/scripts/mock.js, and tests):
//   GET  /__health                       200 "ok"
//   POST /__reset                        empty state, no fault, online, empty journal, real clock
//   POST /__scenario {"name": "x"}       reset, then load mock-api/scenarios/x.json
//   POST /__offline {"on": true}         every app request has its connection dropped (network error in the app)
//   POST /__fault {"path": "^/api/x", "method": "POST", "status": 500, "times": 1}
//                 {"path": "...", "timeout": true}  never answers (the app's timeout fires); times 0 = forever
//   POST /__latency {"ms": 1500}         delay every app answer; {"ms": 8000, "path": "^/api/x"} only matching paths
//                                        (latency and await patterns see the path with its query: "^/api/x\\?.*a=1")
//   POST /__await {"path": "^/api/x", "timeoutMs": 15000}  answers once a matching app request is in flight
//                                        (received, not yet answered: kill the app now); 400 on timeout
//   POST /__clock {"now": "2026-03-06T10:00:00"} / GET /__clock   fixed "now" the e2e app may read at start
//   GET  /__journal[?since=n]            app requests seen so far: method, path, query, body, status, outcome
//   GET  /__state                        server-side truth (contract.state()) for assertions
//   POST /__cmd/<name> {...}             contract.commands[name](body): app-specific actions (e.g. an edit made on
//                                        the website), so that a flow can change the server between two app actions
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function createMockServer(contract, { scenariosDir = path.join(HERE, 'scenarios'), log = () => {} } = {}) {
  let offline = false;
  let latencyMs = 0;
  let latencyPath = null;
  let faults = [];
  let journal = [];
  let clock = null;
  const hanging = new Set();

  function reset() {
    offline = false;
    latencyMs = 0;
    latencyPath = null;
    faults = [];
    journal = [];
    clock = null;
    for (const res of hanging) res.destroy();
    hanging.clear();
    contract.reset();
  }

  function loadScenario(name) {
    if (!/^[\w.-]+$/.test(name || '')) throw new Error(`invalid scenario name "${name}"`);
    const file = path.join(scenariosDir, `${name}.json`);
    if (!fs.existsSync(file)) throw new Error(`scenario ${name} not found in ${path.basename(scenariosDir)}/`);
    reset();
    contract.load(JSON.parse(fs.readFileSync(file, 'utf8')));
  }

  function control(method, route, query, body) {
    if (route === 'health') return 'ok';
    if (route === 'reset' && method === 'POST') {
      reset();
      return { ok: true };
    }
    if (route === 'scenario' && method === 'POST') {
      loadScenario(body.name);
      return { ok: true, scenario: body.name };
    }
    if (route === 'offline' && method === 'POST') {
      offline = body.on !== false;
      return { ok: true, offline };
    }
    if (route === 'latency' && method === 'POST') {
      latencyMs = Number(body.ms) || 0;
      latencyPath = body.path ? new RegExp(body.path) : null;
      return { ok: true, latencyMs, path: body.path || null };
    }
    if (route === 'fault' && method === 'POST') {
      new RegExp(body.path || ''); // invalid patterns fail here, not at the next app request
      faults.push({ path: body.path || '', method: body.method ? String(body.method).toUpperCase() : null, status: Number(body.status) || 500, timeout: Boolean(body.timeout), left: body.times === 0 ? Infinity : Number(body.times) || 1 });
      return { ok: true, faults: faults.length };
    }
    if (route === 'clock') {
      if (method === 'POST') clock = body.now || null;
      return { now: clock };
    }
    if (route === 'journal') return journal.slice(Number(query.get('since')) || 0);
    if (route === 'state') return contract.state();
    if (route.startsWith('cmd/') && method === 'POST') {
      const name = route.slice(4);
      const cmd = contract.commands?.[name];
      if (!cmd) throw new Error(`unknown command "${name}" (contract.commands)`);
      return cmd(body) ?? { ok: true };
    }
    throw new Error(`unknown control route ${method} /__${route}`);
  }

  // An app request received and not answered yet (a slow one), matching `pattern`.
  async function awaitInFlight(pattern, timeoutMs) {
    const re = new RegExp(pattern || '');
    const end = Date.now() + (Number(timeoutMs) || 15000);
    for (;;) {
      const entry = journal.find((j) => j.status === undefined && j.outcome === undefined && re.test(j.query ? `${j.path}?${j.query}` : j.path));
      if (entry) return { ok: true, entry };
      if (Date.now() > end) throw new Error(`no request matching ${pattern} in flight after ${timeoutMs || 15000} ms`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  function takeFault(method, pathname) {
    const f = faults.find((x) => x.left > 0 && (!x.method || x.method === method) && new RegExp(x.path).test(pathname));
    if (f) f.left -= 1;
    return f || null;
  }

  function send(res, status, body, headers = {}) {
    if (body === undefined || body === null) {
      res.writeHead(status, headers).end();
    } else if (typeof body === 'string') {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }).end(body);
    } else {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }).end(JSON.stringify(body));
    }
  }

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url, 'http://mock');
      const raw = Buffer.concat(chunks).toString('utf8');
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = raw;
      }

      if (url.pathname === '/__await' && req.method === 'POST') {
        awaitInFlight(body?.path, body?.timeoutMs).then(
          (r) => send(res, 200, r),
          (err) => send(res, 400, { error: err.message }),
        );
        return;
      }
      if (url.pathname.startsWith('/__')) {
        try {
          send(res, 200, control(req.method, url.pathname.slice(3), url.searchParams, body || {}));
        } catch (err) {
          send(res, 400, { error: err.message });
        }
        return;
      }

      const entry = { at: new Date().toISOString(), method: req.method, path: url.pathname, query: url.search.slice(1), body: raw ? body : undefined };
      journal.push(entry);
      if (offline) {
        entry.outcome = 'offline';
        log(`${req.method} ${req.url} -> dropped (offline)`);
        req.socket.destroy();
        return;
      }
      const fault = takeFault(req.method, url.pathname);
      if (fault?.timeout) {
        entry.outcome = 'timeout';
        log(`${req.method} ${req.url} -> no answer (timeout fault)`);
        hanging.add(res);
        return;
      }
      setTimeout(() => {
        let status;
        let out;
        let headers = {};
        if (fault) {
          status = fault.status;
          out = { error: 'injected fault' };
          entry.outcome = 'fault';
        } else {
          try {
            const r = contract.handle({ method: req.method, path: url.pathname, query: url.searchParams, body, headers: req.headers });
            status = r ? r.status ?? 200 : 404;
            out = r ? r.body : { error: `no route ${req.method} ${url.pathname}` };
            headers = (r && r.headers) || {};
            entry.outcome = r ? 'ok' : 'no-route';
          } catch (err) {
            status = 500;
            out = { error: err.message };
            entry.outcome = 'error';
          }
        }
        entry.status = status;
        log(`${req.method} ${req.url} -> ${status}${entry.outcome !== 'ok' ? ` (${entry.outcome})` : ''}`);
        send(res, status, out, headers);
      }, latencyPath && !latencyPath.test(url.pathname + url.search) ? 0 : latencyMs);
    });
  });
  server.on('close', () => {
    for (const r of hanging) r.destroy();
  });
  reset();
  return server;
}

async function main(argv) {
  const i = argv.indexOf('--port');
  const port = Number(i >= 0 ? argv[i + 1] : process.env.MOCK_PORT) || 8787;
  // contract.mjs (ESM) or contract.cjs (CommonJS: also loadable by Jest without a transform).
  const file = ['contract.mjs', 'contract.cjs'].map((f) => path.join(HERE, f)).find((f) => fs.existsSync(f));
  if (!file) throw new Error('mock-api/contract.mjs or contract.cjs not found');
  const contract = (await import(pathToFileURL(file).href)).default;
  const server = createMockServer(contract, { log: (line) => console.log(`${new Date().toISOString().slice(11, 23)} ${line}`) });
  // Loopback only: the device reaches it through adb reverse, nothing else on the network can.
  server.listen(port, '127.0.0.1', () => console.log(`mock API listening on http://127.0.0.1:${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`mock API: ${err.message}`);
    process.exit(1);
  });
}
