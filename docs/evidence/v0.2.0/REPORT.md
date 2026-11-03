# Verification report: Mes Ouvertures v0.2.0

Overall: PASS
Commit: c33aa31
Date: 2026-11-03 21:25 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: chess-opening-trainer-0.2.0-universal.apk (91.2 MB)
SHA-256: f395e7162140838c83d4161c35a9ecd55ddd564302675891815191374b1366ca

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit c33aa31 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       122 passed, 122 total |
| 4 | expo-doctor | PASS | all checks passed |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | chess-opening-trainer-0.2.0-universal.apk, 91.2 MB, Firebase off |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 2579 ms of 1257 / 2685 / 2579 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 6/6 flows passed, 17 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
