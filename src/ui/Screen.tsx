import { ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { colors, spacing } from './theme';

// Full-screen container that keeps content clear of the status bar (Android edge-to-edge).
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={[styles.screen, { paddingTop: (StatusBar.currentHeight ?? 0) + spacing.lg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
});
