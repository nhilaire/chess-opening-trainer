# Device checks v0.3.0

Checks that `verify.mjs` does not run, done on the emulator against the APK of the verified commit.

- Verified commit: 16ac116
- APK: `android/app/build/outputs/apk/release/app-release.apk` (e2e universal build of verify.mjs, package `io.github.nhilaire.chessopeningtrainer.e2e`)
- APK SHA-256: 798e519a8aa081b9b7aadd386c2487887d0668e9354251262079428188460d23

| Check | Command | Result | Raw output |
|---|---|---|---|
| Launcher name per language (AC-03, APK side) | `node scripts/check-apk.mjs <apk>` | PASS: default "My Openings", fr "Mes Ouvertures", en "My Openings" | `raw/device-apk-check.txt` |
| No AD_ID permission (AC-35) | `node scripts/check-apk.mjs <apk>` (aapt dump badging) | PASS: 8 permissions, no `AD_ID` / `ACCESS_ADSERVICES_AD_ID` | `raw/device-apk-check.txt` |
| Permissions of the installed app (AC-35) | `adb shell dumpsys package io.github.nhilaire.chessopeningtrainer.e2e` | PASS: no AD_ID among requested permissions | `raw/device-installed-permissions.txt` |
| No private API address in git history (AC-48) | `node scripts/secret-scan.mjs --history --dir .` (private host of `privateConfig` as a term) | PASS: history clean | `raw/device-history-scan.txt` |
| Prod APK holds the private host, not the mock (AC-48) | `checkApkVariant(dist/<arm64 prod apk>, prod)` (lib/e2e.mjs, private host of `privateConfig` as term) | PASS: bundle uses the private endpoint, not the mock (re-checked by build-apk at release) | `raw/device-prod-apk-variant.txt` |
| e2e APK targets the mock only (AC-48) | verify.mjs "e2e variant isolated from production" (bundle read from the APK) | PASS: bundle targets localhost:8787, 0 private endpoint | `REPORT.md` |

Notes:
- INTERNET is needed by the openings API; ACCESS_NETWORK_STATE comes from the framework.
- The prod APK (private host, checked by build-apk at release) is installed on the user's phone only and is never
  attached to a GitHub release (AC-48, recorded in RELEASE.md).
- The name under the icon on the phone itself (AC-03) and the cold start on the phone (AC-33) are checked at
  release on the user's phone.
