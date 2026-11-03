# Device checks v0.1.0

Checks that `verify.mjs` does not run, done on the emulator against the APK of the verified commit.

- Verified commit: 51631b8
- APK: `android/app/build/outputs/apk/release/app-release.apk` (universal release build of verify.mjs)
- APK SHA-256: 8561a6e273ac02776f34ab3acb63b6eb43e2c8cfb9821c7d701402d9c357aa6f

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
