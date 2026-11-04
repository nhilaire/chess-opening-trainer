// Metro config (Expo defaults) + the build variant's openings API address. src/config/env resolves to
// env.local.ts (prod: private, git-ignored) or env.e2e.ts (mock API) from FACTORY_APP_ENV, set by the factory's
// build-apk. Jest, tsc and the dev server see the committed placeholder env.ts. Compare the RESOLVED path: the import
// is relative ('../config/env').
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const variant = process.env.FACTORY_APP_ENV; // 'prod' | 'e2e' | undefined
const override = { prod: 'env.local.ts', e2e: 'env.e2e.ts' }[variant];
const ENV_MODULE = path.join(__dirname, 'src', 'config', 'env');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = moduleName.startsWith('.') ? path.resolve(path.dirname(context.originModulePath), moduleName) : null;
  if (override && target === ENV_MODULE) {
    const file = path.join(__dirname, 'src', 'config', override);
    if (!fs.existsSync(file)) throw new Error(`${override} missing for FACTORY_APP_ENV=${variant}`);
    return { type: 'sourceFile', filePath: file };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
