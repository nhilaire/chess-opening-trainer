# Firebase configuration (local only)

Put the `google-services.json` downloaded from the Firebase console in this folder:

```
firebase/google-services.json   <- git-ignored, never committed
```

- The file identifies a Firebase project. It is not a password, but this repository is public, so it stays local.
- Without it the app still builds: telemetry calls become no-ops.
- Collection is opt-in: `firebase.json` (repository root) disables automatic collection, the advertising ID and
  ad storage. The consent screen enables Analytics and Crashlytics only after the player accepts.
- In the Google Cloud console, the API key must be restricted to the Android app (package + release SHA-1) and to
  Firebase APIs only.
