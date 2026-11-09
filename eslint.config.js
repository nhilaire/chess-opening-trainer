// ESLint flat config: Expo's rules (React, React Native, TypeScript, imports) over the app's source.
// Node scripts of the repository (scripts/, mock-api/, plugins/) run outside the app: they get Node globals.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'coverage/*', 'docs/*'] },
  {
    files: ['scripts/**', 'mock-api/**', 'plugins/**', '*.config.js', 'app.config.js', 'jest.setup.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly', console: 'readonly', Buffer: 'readonly' },
    },
  },
  // jest.setup.js registers the mocks with the Jest global before any test file is loaded.
  { files: ['jest.setup.js'], languageOptions: { globals: { jest: 'readonly' } } },
  // Tests load modules with require() inside jest.isolateModules / jest.spyOn on purpose.
  { files: ['**/__tests__/**', '**/*.test.*'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  // Maestro runScript files run in Maestro's GraalJS sandbox (ES5 `var`, `http`, `output`, `json`, flow env variables).
  {
    files: ['.maestro/scripts/**'],
    languageOptions: { globals: { http: 'readonly', output: 'writable', json: 'readonly', console: 'readonly' } },
    rules: { 'no-var': 'off', 'no-undef': 'off' },
  },
]);
