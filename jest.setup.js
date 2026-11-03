// Native modules are replaced by in-memory mocks so that tests run in Node.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setConsent: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => ({})),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

// The phone's languages: French by default; a test can switch with
// jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']).
jest.mock('./src/i18n/deviceLocale', () => ({ deviceLanguageTags: jest.fn(() => ['fr-FR']) }));
