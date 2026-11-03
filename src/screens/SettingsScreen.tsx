import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LANGUAGE_NAMES, LANGUAGES, LanguageSetting } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import type { Feedback } from '../storage/repertoireStore';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';
import { useBack } from '../ui/useBack';

type Props = { feedback: Feedback; onFeedback: (feedback: Feedback) => void; onAbout: () => void; onBack: () => void };

export function SettingsScreen({ feedback, onFeedback, onAbout, onBack }: Props) {
  const { t, setting, setSetting } = useI18n();
  useBack(onBack);
  const choices: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t.settings.languageAuto },
    ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
  ];
  const toggle = (key: keyof Feedback, label: string) => (
    <View style={styles.row}>
      <Text style={[styles.label, styles.rowText]}>{label}</Text>
      <Switch
        value={feedback[key]}
        onValueChange={(value) => onFeedback({ ...feedback, [key]: value })}
        accessibilityLabel={label}
        testID={`settings-${key}`}
        trackColor={{ true: colors.accent, false: colors.background }}
      />
    </View>
  );

  return (
    <Screen testID="settings-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.settings.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
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
        <View style={styles.group}>
          {toggle('sound', t.settings.sound)}
          {toggle('vibration', t.settings.vibration)}
        </View>
        <Button label={t.settings.about} onPress={onAbout} variant="secondary" testID="settings-about" />
      </ScrollView>
      <Button label={t.settings.back} onPress={onBack} variant="secondary" testID="settings-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  group: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  rowText: { flex: 1 },
  choice: { minHeight: 44, borderRadius: 10, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: font.body },
  choiceTextSelected: { color: colors.text, fontWeight: '700' },
});
