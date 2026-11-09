# Release: Mes Ouvertures v0.3.1

Phone install: PASS
User acceptance: confirmed (2026-11-09)
Date: 2026-11-09
Commit: 03b6daf
APK: chess-opening-trainer-0.3.1-arm64-v8a.apk (35.5 MB, arm64-v8a)
SHA-256: 3ba5cffea39c52a573f08a1d86bc24ba72aa777e35b60b2b94b5ab8b5d3adbb1
Signature: release signature valid
Phone: Android 11 (API 30, arm64-v8a)
Launch check: alive after 10 s, no fatal error

## Notes from the user test

## Phone measurements

- Cold start (`am start -W -S`, 3 runs after force-stop, raw/phone-cold-start.txt): TotalTime 800 / 740 / 757 ms,
  median 757 ms < 3 s (AC-33).
- Play log of the user's session (raw/phone-logcat-play.txt): 5170 lines of the app, 0 fatal line.

## Publication

- The prod APK holds the private API address (raw/device-prod-apk-variant.txt: `checkApkVariant(..., prod)`: PASS,
  bundle uses the private endpoint, not the mock): it is installed on the user's phone only and is never attached to
  a GitHub release (AC-48).
