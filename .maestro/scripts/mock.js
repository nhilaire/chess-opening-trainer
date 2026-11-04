// Drives the mock API from a Maestro flow (verify.mjs passes MOCK_URL; the device reaches the mock by adb reverse).
//
//   - runScript:
//       file: scripts/mock.js
//       env:
//         MOCK_ACTION: scenario          # reset | scenario | offline | fault | latency | await | clock | state | journal | cmd/<name>
//         MOCK_BODY: '{"name": "week-1"}'
//   - assertTrue: ${output.mock.items.length == 2}     # answer of the mock, as JSON
//
// Run a flow by hand: maestro test -e MOCK_URL=http://localhost:8787 -e APP_ID=<package>.e2e .maestro/<flow>.yaml
// (after `node mock-api/server.mjs` and `adb reverse tcp:8787 tcp:8787`).
var base = typeof MOCK_URL === 'undefined' ? 'http://localhost:8787' : MOCK_URL;
var action = typeof MOCK_ACTION === 'undefined' ? 'health' : MOCK_ACTION;
var url = base + '/__' + action;
var reading = action === 'health' || action === 'state' || action === 'journal' || (action === 'clock' && typeof MOCK_BODY === 'undefined');
var response = reading
  ? http.get(url)
  : http.post(url, { headers: { 'Content-Type': 'application/json' }, body: typeof MOCK_BODY === 'undefined' ? '{}' : MOCK_BODY });
if (response.status !== 200) {
  throw new Error('mock ' + action + ' failed: HTTP ' + response.status + ' ' + response.body);
}
output.mock = action === 'health' ? response.body : json(response.body);
