# Verification report: Mes Ouvertures v0.3.1

Overall: PASS
Commit: 762e9fb
Date: 2026-11-09 10:54 UTC
Stack: expo
Variant: e2e (io.github.nhilaire.chessopeningtrainer.e2e, mock API mock-api/server.mjs on port 8787; production endpoints never used)
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: chess-opening-trainer-0.3.1-e2e-universal.apk (90.9 MB)
SHA-256: 30282dced3312c97f93b507fb07359745944e692e6e80425b7d322da93e31791

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 762e9fb |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | lint | WARN | no "lint" script in package.json (app scaffolded before ESLint was part of the overlay) |
| 4 | unit tests (Jest) | PASS | Tests:       156 passed, 156 total |
| 5 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 6 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 7 | release build | PASS | chess-opening-trainer-0.3.1-e2e-universal.apk, 90.9 MB, Firebase off |
| 8 | e2e variant isolated from production | PASS | io.github.nhilaire.chessopeningtrainer.e2e: bundle targets localhost:8787, 0 private endpoint |
| 9 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 10 | mock API started | PASS | mock-api/server.mjs on port 8787 (raw/mock-api.txt) |
| 11 | adb reverse to the mock API | PASS | device localhost:8787 -> host |
| 12 | install (adb) | PASS | Performing Streamed Install Success |
| 13 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 14 | cold start time | PASS | median 747 ms of 1052 / 714 / 747 ms after a warm-up launch (target < 3000 ms) |
| 15 | Maestro E2E flows | PASS | 7/7 flows passed, 17 screenshots in screens/ |
| 16 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
