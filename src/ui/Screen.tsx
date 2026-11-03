import { ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from './theme';

// Full-screen container that keeps content clear of the status bar and the navigation bar (Android edge-to-edge:
// a button drawn under a system bar cannot be tapped).
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) + spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          paddingLeft: insets.left + spacing.md,
          paddingRight: insets.right + spacing.md,
        },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, gap: spacing.md },
});
