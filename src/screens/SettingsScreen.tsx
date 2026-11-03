import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { LANGUAGE_NAMES, LANGUAGES, LanguageSetting } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = { telemetryEnabled: boolean; onToggleTelemetry: (granted: boolean) => void; onBack: () => void };

export function SettingsScreen({ telemetryEnabled, onToggleTelemetry, onBack }: Props) {
  const { t, setting, setSetting } = useI18n();
  const choices: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t.settings.languageAuto },
    ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
  ];

  return (
    <Screen testID="settings-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.settings.title}
      </Text>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>{t.settings.telemetry}</Text>
          <Text style={styles.help}>{t.settings.telemetryHelp}</Text>
        </View>
        <Switch
          value={telemetryEnabled}
          onValueChange={onToggleTelemetry}
          accessibilityLabel={t.settings.telemetry}
          testID="settings-telemetry"
          trackColor={{ true: colors.accent, false: colors.surface }}
        />
      </View>
      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t.settings.language}>
        <Text style={styles.label}>{t.settings.language}</Text>
        {choices.map(({ value, label }) => {
          const selected = value === setting;
          return (
            <Pressable
              key={value}
              testID={`settings-language-${value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={label}
              onPress={() => setSetting(value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.spacer} />
      <Button label={t.settings.back} onPress={onBack} variant="secondary" testID="settings-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  help: { color: colors.muted, fontSize: font.small },
  group: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  choice: { minHeight: 44, borderRadius: 10, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: font.body },
  choiceTextSelected: { color: colors.text, fontWeight: '700' },
  spacer: { flex: 1 },
});
