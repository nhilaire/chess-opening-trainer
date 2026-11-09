# Device checks v0.3.1

Checks that `verify.mjs` does not run, done on the emulator (sdk_gphone64_x86_64, Android 16, cold-booted) against
the APK of the verified commit, right after the REPORT.md run, on 2026-11-09.

- Verified commit: 762e9fb (REPORT.md Overall PASS)
- APK: `dist/chess-opening-trainer-0.3.1-e2e-universal.apk` (e2e universal build, package
  `io.github.nhilaire.chessopeningtrainer.e2e`, the same file as `android/app/build/outputs/apk/release/app-release.apk`)
- APK SHA-256: 30282dced3312c97f93b507fb07359745944e692e6e80425b7d322da93e31791 (same as REPORT.md)
- v0.3.1 changes since v0.3.0 (16ac116): home counts follow midnight (T-32, AC-19), refresh no longer stuck on a 304
  without stored copy (T-33, AC-40, AC-41 amended in 762e9fb), drag moves the piece touched (T-34, AC-27), session
  summary keeps a learnt line as learnt (T-35, AC-46). No change to permissions, launcher names or private config.

| Check | Command | Result | Raw output |
|---|---|---|---|
| Launcher name per language (AC-03, APK side) | `node scripts/check-apk.mjs <apk>` | PASS: default "My Openings", fr "Mes Ouvertures", en "My Openings" | `raw/device-apk-check.txt` |
| No AD_ID permission (AC-35) | `node scripts/check-apk.mjs <apk>` (aapt dump badging) | PASS: 8 permissions (FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, INTERNET, MODIFY_AUDIO_SETTINGS, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION), no `AD_ID` / `ACCESS_ADSERVICES_AD_ID` | `raw/device-apk-check.txt` |
| Permissions of the installed app (AC-35) | `adb shell dumpsys package io.github.nhilaire.chessopeningtrainer.e2e` | PASS: versionName=0.3.1, 0 AD_ID among requested permissions | `raw/device-installed-permissions.txt` |
| No private API address in git history (AC-48) | `node scripts/secret-scan.mjs --history --dir .` (private host of `privateConfig` as a term) | PASS: `secret-scan (history): clean` on 762e9fb | `raw/device-history-scan.txt` |
| e2e APK targets the mock only (AC-48) | verify.mjs "e2e variant isolated from production" (bundle read from the APK) | PASS: bundle targets localhost:8787, 0 private endpoint | `REPORT.md` step 8 |
| Prod APK holds the private host, not the mock (AC-48) | `checkApkVariant(dist/chess-opening-trainer-0.3.1-arm64-v8a.apk, prod)` (lib/e2e.mjs, private host of `privateConfig` as term), run at release on 2026-11-09 on the phone APK SHA-256 3ba5cffe… | PASS: bundle uses the private endpoint, not the mock | `raw/device-prod-apk-variant.txt` |

Notes:
- INTERNET is needed by the openings API; ACCESS_NETWORK_STATE comes from the framework.
- The prod APK (private host, checked by build-apk at release) is installed on the user's phone only and is never
  attached to a GitHub release (AC-48, recorded in RELEASE.md).
- The name under the icon on the phone itself (AC-03), the drag on a real touch screen (AC-27) and the cold start on
  the phone (AC-33) are checked at release on the user's phone.
