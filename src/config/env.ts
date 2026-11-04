// Openings API base URL. Committed placeholder (RFC 2606: never resolves); the prod bundle uses env.local.ts
// (git-ignored, real address) and the e2e bundle env.e2e.ts (mock API), chosen by metro.config.js from
// FACTORY_APP_ENV. Jest and tsc see this file. To build locally: copy this file to env.local.ts with the real URL.
export const OPENINGS_API_BASE_URL = 'https://example.invalid';
