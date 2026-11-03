// Expo config plugin: applied at every `npx expo prebuild`, so release signing survives android/ regeneration.
// Apps with a mock API also get the e2e package suffix (factory-app.json e2e.packageSuffix).
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle } = require('expo/config-plugins');

const { patchBuildGradle } = require('./release-signing-patch');

function e2eSuffix() {
  const file = path.join(__dirname, '..', 'factory-app.json');
  const meta = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return (meta.e2e && meta.e2e.packageSuffix) || '';
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('with-release-signing: only a Groovy android/app/build.gradle is supported');
    }
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents, { e2eSuffix: e2eSuffix() });
    return cfg;
  });
};
