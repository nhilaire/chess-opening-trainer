// Expo config plugin: cleartext HTTP allowed to localhost only (the mock API through adb reverse, e2e variant).
// Harmless in prod: the real API is HTTPS and every other host stays HTTPS-only.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
  </domain-config>
</network-security-config>
`;

module.exports = function withLocalhostCleartext(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'network_security_config.xml'), XML);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    delete app.$['android:usesCleartextTraffic'];
    return cfg;
  });
};
