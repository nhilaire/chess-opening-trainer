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
- [ ] T-10 Board component: cburnett SVG pieces, tap-tap and drag, legal-move highlights, last move, arrows, flip, square testIDs (AC-21, AC-27) - proof: unit
- [ ] T-11 Home and opening detail screens: review button, counts, empty state, rename, delete with confirmation (AC-04, AC-13, AC-14, AC-20, AC-36, AC-37) - proof: unit
- [ ] T-12 Import screen: paste, name prefill, colour, inline errors (AC-11, AC-12) - proof: unit
- [ ] T-13 Training and summary screens: prompts, banners, progress, stop and Android Back (AC-25, AC-26, AC-28) - proof: unit
- [ ] T-14 Settings (language, sounds, vibrations) and feedback module with generated sounds and haptics (AC-02, AC-31) - proof: unit
- [ ] T-15 About screen: story, author, version, piece credit (AC-32) - proof: unit
- [ ] T-16 Maestro flows: smoke with README captures, language, import, manage, train discovery and wrong moves, stop, restart persistence, settings, about (AC-02, AC-04, AC-11, AC-12, AC-13, AC-14, AC-20, AC-25, AC-26, AC-28, AC-29, AC-31, AC-32, AC-34) - proof: e2e
- [ ] T-17 Device checks prepared: launcher name per language, cold start, release manifest without AD_ID (AC-03, AC-33, AC-35) - proof: device

## Notes

- Order: engine (T-02..T-07) before screens; every rule is a pure function in `src/game/` with `today` (local date
  string) injected, never read inside.
- `chess.js` is used for legality and SAN normalisation only; the tree, lines, scheduler and queue are ours.
- T-01 exists because the factory scaffold ignores `firebase: none` (kaizen item).
- The e2e training flows rely on the first embedded line in tree order (d4 openings, White) and square testIDs
  (`sq-e2`), so Maestro can play moves by tap-tap.
- Sounds are generated WAVs (no third-party audio licence); pieces are the Lichess cburnett set (CC BY-SA 3.0).
