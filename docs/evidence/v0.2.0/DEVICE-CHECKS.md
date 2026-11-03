# Device checks v0.2.0

Checks that `verify.mjs` does not run, done on the emulator against the APK of the verified commit.

- Verified commit: c33aa31
- APK: `android/app/build/outputs/apk/release/app-release.apk` (universal release build of verify.mjs)
- APK SHA-256: f395e7162140838c83d4161c35a9ecd55ddd564302675891815191374b1366ca

| Check | Command | Result | Raw output |
|---|---|---|---|
| Launcher name per language (AC-03, APK side) | `node scripts/check-apk.mjs <apk>` | PASS: default "My Openings", fr "Mes Ouvertures", en "My Openings" | `raw/device-apk-check.txt` |
| No AD_ID permission (AC-35) | `node scripts/check-apk.mjs <apk>` (aapt dump badging) | PASS: 8 permissions, no `AD_ID` / `ACCESS_ADSERVICES_AD_ID` | `raw/device-apk-check.txt` |
| Permissions of the installed app (AC-35) | `adb shell dumpsys package io.github.nhilaire.chessopeningtrainer` | PASS: no AD_ID among requested permissions | `raw/device-installed-permissions.txt` |

Notes:
- INTERNET stays in the manifest (framework default, allowed by the PRD); the app makes no network request.
- FOREGROUND_SERVICE / FOREGROUND_SERVICE_MEDIA_PLAYBACK / MODIFY_AUDIO_SETTINGS come from expo-audio.
- The name under the icon on the phone itself (AC-03) and the cold start on the phone (AC-33) are checked at
  release on the user's phone.
