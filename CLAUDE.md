# Mes Ouvertures (chess-opening-trainer)

Small Android game built with React Native by the Android game factory. Package: `io.github.nhilaire.chessopeningtrainer`.

## Non-negotiable rules

- **Languages**: code, comments, commits, README and docs in English. Everything the player sees exists in **every
  language of the game** (`factory-app.json` "languages"): dictionaries in `src/i18n/<lang>.ts`, French (`fr.ts`) is the
  reference and the others must have the same keys (compile error otherwise). Components never inline text: they use
  `const { t } = useI18n()`. Language-specific images and spoken audio are dictionary entries too. The language follows
  the phone (fallback: `fallbackLanguage`) unless the player picks one in the settings. French typography: no-break
  space before `: ; ! ?`; English: none.
- **No secrets, no personal data in git.** Keystores, `.env`, APKs stay local.
  Never write a real name, email, phone number or local user path in code, docs, screenshots or logs.
  The pre-commit and pre-push hooks run `scripts/secret-scan.mjs`; never bypass them (`--no-verify` is forbidden).
- **No telemetry** (`factory-app.json` firebase "none"): no Firebase, no consent screen, no analytics, nothing
  leaves the phone. Errors go to the device log only (`src/util/log.ts`).
- **Prove it works.** A change is done when its proof exists: unit test, Maestro flow, or evidence report.
  "It should work" is not a proof.
- **Final app name** = `displayName` in `factory-app.json` (single source). Project slug `chess-opening-trainer` is only the repo/folder name.

## Layout

| Path | Content |
|---|---|
| `src/game/` | Pure TypeScript game logic (no React): state, rules, scoring. 100% unit-tested. |
| `src/screens/`, `src/ui/` | React components. No game rules here. |
| `src/storage/` | Local persistence (AsyncStorage, versioned keys). |
| `src/i18n/` | Player-facing text per language (`fr.ts` reference, `en.ts`...), language resolution, provider. |
| `.maestro/` | E2E flows run on the emulator; screenshots become evidence. |
| `docs/` | BRIEF, PRD, ADRs, PLAN, KPIS, evidence per version. |

## Commands

```bash
npm test               # Jest unit + component tests
npm run typecheck      # TypeScript, no emit
node scripts/secret-scan.mjs --worktree   # secrets / PII scan of the working tree
```

Build, install and verification are driven from the factory (`verify-app`, `release-apk` skills).
