# Verification report: Mes Ouvertures v0.1.0

Overall: PASS
Commit: 51631b8
Date: 2026-11-03 17:08 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: chess-opening-trainer-0.1.0-universal.apk (91.2 MB)
SHA-256: 8561a6e273ac02776f34ab3acb63b6eb43e2c8cfb9821c7d701402d9c357aa6f

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 51631b8 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       119 passed, 119 total |
| 4 | expo-doctor | PASS | all checks passed |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | chess-opening-trainer-0.1.0-universal.apk, 91.2 MB, Firebase off |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 1433 ms of 1610 / 1408 / 1433 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 6/6 flows passed, 17 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
