// Jest: unit tests for pure game logic + component tests (React Native Testing Library).
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  // Worklets (Reanimated 4) loads its web build in Jest instead of the native one.
  resolver: 'react-native-worklets/jest/resolver.js',
  // Full-app renders exceed the 5 s default when the emulator loads the machine during verify.
  testTimeout: 30000,
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
};
