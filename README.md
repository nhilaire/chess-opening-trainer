# Mes Ouvertures

A small Android game made with React Native. The game speaks French and English (it follows the phone's language;
you can change it in the settings).

## Screenshots

<!-- factory:screenshots:start -->
<p>
  <img src="docs/screenshots/readme-1-home.png" width="240" alt="home">
  <img src="docs/screenshots/readme-2-discovery.png" width="240" alt="discovery">
  <img src="docs/screenshots/readme-3-answer.png" width="240" alt="answer">
</p>
<!-- factory:screenshots:end -->

## Play

Download the APK attached to the latest release (if any) or build it yourself (below), then install it on an
Android phone (allow installation from unknown sources).

## Privacy

- No account, no ads, no personal data.
- No statistics and no crash reports: the app sends nothing, your repertoire and progress stay on the phone.

## Build from source

Requirements: Node.js 20+, JDK 17, Android SDK.

```bash
npm install
npm test
```

Release signing reads `FACTORY_STORE_FILE`, `FACTORY_STORE_PASSWORD`, `FACTORY_KEY_ALIAS` and
`FACTORY_KEY_PASSWORD` from your user-level `~/.gradle/gradle.properties`; without them the release build is
signed with the debug key.

## Project docs

- [Product requirements](docs/PRD.md)
- [Architecture decisions](docs/adr/)
- [Verification evidence](docs/evidence/)
