import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, spacing } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', testID }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, primary ? styles.primary : styles.secondary, pressed && styles.pressed]}
    >
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 14, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  label: { fontSize: font.body, fontWeight: '700' },
  primaryLabel: { color: colors.accentText },
  secondaryLabel: { color: colors.text },
});
