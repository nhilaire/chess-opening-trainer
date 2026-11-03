// Typed catalog of the only telemetry events this app may send (must match docs/PRD.md "Telemetry events").
// Params are numbers or short lowercase enums. Never identifiers, names, free text or locations.

export type TelemetryEvents = {
  game_start: { level: number };
  game_over: { level: number; score: number; duration_s: number };
};

export type EventName = keyof TelemetryEvents;

export type SafeParams = Record<string, number | string>;

const KEY_FORMAT = /^[a-z][a-z0-9_]{0,39}$/;
// Whole-word checks for short tokens ("ip", "lat"...): a substring test dropped legitimate keys like "skipped".
const FORBIDDEN_KEY = /(mail|name|phone|address|user|device|location|token|uuid|(^|_)(ip|lat|lng|lon|id)(_|$))/i;
const ENUM_VALUE = /^[a-z0-9_]{1,36}$/;

// Drops anything that could carry personal data. Booleans become 0/1 (Analytics has no boolean type).
export function sanitizeParams(params: Record<string, unknown>): SafeParams {
  const safe: SafeParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!KEY_FORMAT.test(key) || FORBIDDEN_KEY.test(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === 'boolean') safe[key] = value ? 1 : 0;
    else if (typeof value === 'string' && ENUM_VALUE.test(value)) safe[key] = value;
  }
  return safe;
}
