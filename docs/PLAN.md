# Plan: Mes Ouvertures v0.1.0

Each task is small (one commit), references the acceptance criteria it serves, and names its proof.
Format: `- [ ] T-01 Title (AC-01, AC-02) - proof: unit|e2e|device`. Check the box only when the proof passes.

## Tasks

- [x] T-01 Remove Firebase, consent screen and telemetry module (`firebase: none`), app opens on home (AC-35, AC-04) - proof: unit
- [x] T-02 PGN parser: tags, move numbers, nested variations, comments with `[%...]` removed, NAGs, results, `0-0`, multi-game merge, name prefill, validation errors (AC-07, AC-08, AC-09, AC-10) - proof: unit
- [x] T-03 Repertoire lines: start-to-leaf paths, ids from normalised SAN, labels, tree order, lines without a player move ignored (AC-06) - proof: unit
- [x] T-04 Embedded openings: convert the 3 PWA trees to PGN (accents restored), localized names until renamed (AC-05, AC-37) - proof: unit
- [x] T-05 Leitner scheduler: boxes 1-6, intervals, failed-today rule, 5 new lines per day, counts (AC-15, AC-16, AC-19) - proof: unit
- [x] T-06 Session queue: due first with tie-breaks, new lines, re-queue once, single-opening fallback (AC-17, AC-18) - proof: unit
- [x] T-07 Line trainer engine: discovery and review modes, other-branch rule, two tries then arrow, promotion, Black's first move (AC-21, AC-22, AC-23, AC-24) - proof: unit
- [x] T-08 Persistence: openings, line states, daily counter, settings, versioned keys, corrupt data falls back (AC-30) - proof: unit
- [x] T-09 Dictionaries fr/en with all PRD copy, plurals, language resolution kept (AC-01, AC-38) - proof: unit
- [x] T-10 Board component: cburnett SVG pieces, tap-tap and drag, legal-move highlights, last move, arrows, flip, square testIDs (AC-21, AC-27) - proof: unit
- [x] T-11 Home and opening detail screens: review button, counts, empty state, rename, delete with confirmation (AC-04, AC-13, AC-14, AC-20, AC-36, AC-37) - proof: unit
- [x] T-12 Import screen: paste, name prefill, colour, inline errors (AC-11, AC-12) - proof: unit
- [x] T-13 Training and summary screens: prompts, banners, progress, stop and Android Back (AC-25, AC-26, AC-28) - proof: unit
- [x] T-14 Settings (language, sounds, vibrations) and feedback module with generated sounds and haptics (AC-02, AC-31) - proof: unit
- [x] T-15 About screen: story, author, version, piece credit (AC-32) - proof: unit
- [x] T-16 Maestro flows: smoke with README captures, language, import, manage, train discovery and wrong moves, stop, restart persistence, settings, about (AC-02, AC-04, AC-11, AC-12, AC-13, AC-14, AC-20, AC-25, AC-26, AC-28, AC-29, AC-31, AC-32, AC-34) - proof: e2e
- [x] T-17 Device checks prepared: launcher name per language, cold start, release manifest without AD_ID (AC-03, AC-33, AC-35) - proof: device

- [x] T-18 v0.2.0 scheduler and queue: no daily limit, every line of the scope in random order (injected random), not-due success unchanged, not-due failure to box 1, home count = all lines (AC-15, AC-16, AC-17, AC-18, AC-19) - proof: unit
- [x] T-19 v0.2.0 state, storage and screens: drop the daily counter (old key ignored), detail button always enabled, « Rien à réviser » only without lines (AC-20, AC-30) - proof: unit
- [x] T-20 v0.2.0 Maestro flows independent of the random order: smoke checks the total and any arrow, empty state after deleting all openings (AC-20, AC-25) - proof: e2e
- [x] T-21 v0.2.0 Scandinavian 7. h3 line, embedded openings refreshed on existing installs (AC-05, AC-39) - proof: unit

- [x] T-22 v0.3.0 API model: detail JSON to opening (shape check, sibling merge, legality with chess.js, no player move = invalid), line ids colour|moves, labels from `name` (AC-05, AC-06, AC-37) - proof: unit
- [x] T-23 v0.3.0 API client and refresh: GET only, 45 s timeout, If-None-Match/304, list then details, replace on success, skip invalid openings, keep everything on failure (AC-40, AC-41, AC-42) - proof: unit
- [x] T-24 v0.3.0 storage: embedded seed with API ids, ETags, v0.2.0 progress keys rewritten colour|moves, missing lines ignored (AC-30, AC-45) - proof: unit
- [x] T-25 v0.3.0 trainer: review walk accepting any repertoire move, opponent follows the target then weighted draw, arrows on every expected move after the 2nd error (AC-21, AC-22, AC-23, AC-24, AC-46, AC-47) - proof: unit
- [x] T-26 v0.3.0 session: finished line = leaf reached, removed from the rest of the queue, re-queue of the reached line, new line reached counted learnt (AC-15, AC-16, AC-17, AC-18, AC-19, AC-46) - proof: unit
- [x] T-27 v0.3.0 screens: no import, rename or delete; home updating / offline / partial lines; refresh never touches a running session; detail of a removed opening back to home; plural answer copy (AC-20, AC-26, AC-36, AC-38, AC-49) - proof: unit
- [x] T-28 v0.3.0 build config: env.ts placeholder, env.local.ts private, env.e2e.ts mock, metro resolver on FACTORY_APP_ENV, e2e package suffix, cleartext to localhost only (AC-42, AC-48) - proof: device
- [x] T-29 v0.3.0 mock API (contract with ETag/304, fake repertoire scenarios) and Maestro flows rewritten for the API: offline first launch, API openings, change after restart, offline after restart, slow API (AC-02, AC-04, AC-20, AC-25, AC-26, AC-28, AC-29, AC-31, AC-32, AC-34, AC-43, AC-44) - proof: e2e
- [x] T-30 v0.3.0 device checks prepared (run in /verify-app and /release-apk): launcher names, permissions, no private host in git, e2e APK mock-only, prod APK not attached to a release (AC-03, AC-33, AC-35, AC-48) - proof: device
- [x] T-31 v0.3.0 icon, adaptive icon and splash drawn by scripts/generate-icons.mjs, expo-splash-screen on the app background (AC-50) - proof: device

## Notes

- Order: engine (T-02..T-07) before screens; every rule is a pure function in `src/game/` with `today` (local date
  string) injected, never read inside.
- `chess.js` is used for legality and SAN normalisation only; the tree, lines, scheduler and queue are ours.
- T-01 exists because the factory scaffold ignores `firebase: none` (kaizen item).
- Since v0.2.0 the queue order is random: e2e flows that play moves train a one-line imported opening, the smoke
  flow only checks the total and that some arrow is shown; square testIDs (`sq-e2`) let Maestro play by tap-tap.
- T-16 flows and T-17 checks are written here; they run in /verify-app (emulator) and at release (phone):
  `node scripts/check-apk.mjs <apk>` reads launcher names per language and permissions (AC-03, AC-35).
- Sounds are generated WAVs (no third-party audio licence); pieces are the Lichess cburnett set (CC BY-SA 3.0).
