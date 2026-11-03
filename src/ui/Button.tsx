import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, spacing } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, testID }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 14, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  label: { fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  primaryLabel: { color: colors.accentText },
  secondaryLabel: { color: colors.text },
});
