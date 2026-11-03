// Native modules are replaced by in-memory mocks so that tests run in Node.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The phone's languages: French by default; a test can switch with
// jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']).
jest.mock('./src/i18n/deviceLocale', () => ({ deviceLanguageTags: jest.fn(() => ['fr-FR']) }));

// Gesture Handler and Reanimated ship their own Jest mocks.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
