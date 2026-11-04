# Verification report: Mes Ouvertures v0.3.0

Overall: PASS
Commit: 16ac116
Date: 2026-11-04 09:41 UTC
Stack: expo
Variant: e2e (io.github.nhilaire.chessopeningtrainer.e2e, mock API mock-api/server.mjs on port 8787; production endpoints never used)
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: chess-opening-trainer-0.3.0-e2e-universal.apk (90.9 MB)
SHA-256: 798e519a8aa081b9b7aadd386c2487887d0668e9354251262079428188460d23

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 16ac116 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       145 passed, 145 total |
| 4 | expo-doctor | PASS | all checks passed |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | chess-opening-trainer-0.3.0-e2e-universal.apk, 90.9 MB, Firebase off |
| 7 | e2e variant isolated from production | PASS | io.github.nhilaire.chessopeningtrainer.e2e: bundle targets localhost:8787, 0 private endpoint |
| 8 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 9 | mock API started | PASS | mock-api/server.mjs on port 8787 (raw/mock-api.txt) |
| 10 | adb reverse to the mock API | PASS | device localhost:8787 -> host |
| 11 | install (adb) | PASS | Performing Streamed Install Success |
| 12 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 13 | cold start time | PASS | median 629 ms of 634 / 629 / 562 ms after a warm-up launch (target < 3000 ms) |
| 14 | Maestro E2E flows | PASS | 7/7 flows passed, 17 screenshots in screens/ |
| 15 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
