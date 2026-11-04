# Release: Mes Ouvertures v0.3.0

Phone install: PASS
User acceptance: confirmed (2026-11-04)
Date: 2026-11-04
Commit: c7614ac
APK: chess-opening-trainer-0.3.0-arm64-v8a.apk (35.5 MB, arm64-v8a)
SHA-256: c00cee5c7997e26a06f5fbef35d4d7290fe5df0f1bf535c80fbfeba1f9466504
Signature: release signature valid
Phone: Android 11 (API 30, arm64-v8a)
Launch check: alive after 10 s, no fatal error

## Notes from the user test

- 2026-11-04: the user played v0.3.0 on the phone (openings from the API, icon, splash, review following the
  chosen branch) and accepted it: "c'est good pour moi". Drag and drop works but the user does not like it and will
  use tap-tap instead (no change asked). The release build logs nothing to logcat (ReactNativeJS lines: 0, no
  AndroidRuntime crash for the app: raw/phone-logcat-play.txt).

## Publication

- The prod APK holds the private API address (raw/device-prod-apk-variant.txt): it is installed on the user's phone
  only and is never attached to a GitHub release (AC-48).
