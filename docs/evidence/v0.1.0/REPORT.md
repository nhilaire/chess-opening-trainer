# Verification report: Mes Ouvertures v0.1.0

Overall: PASS
Commit: 5687023
Date: 2026-11-03 16:22 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: chess-opening-trainer-0.1.0-universal.apk (91.2 MB)
SHA-256: b63e8dfd62ca93e6c5b27ec3fd3198c58931486637c1b41e670a60ae49334e15

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 5687023 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       119 passed, 119 total |
| 4 | expo-doctor | PASS | all checks passed |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | chess-opening-trainer-0.1.0-universal.apk, 91.2 MB, Firebase off |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 2382 ms of 4634 / 1688 / 2382 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 6/6 flows passed, 17 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
