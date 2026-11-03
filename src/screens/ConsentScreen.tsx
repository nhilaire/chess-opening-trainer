import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

// First-launch consent (GDPR/CNIL): both choices are equally easy, nothing is sent before a choice.
export function ConsentScreen({ onDecision }: { onDecision: (granted: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Screen testID="consent-screen">
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {t.consent.title}
        </Text>
        <Text style={styles.body}>{t.consent.body}</Text>
        <Text style={styles.footnote}>{t.consent.footnote}</Text>
      </View>
      <Button label={t.consent.accept} onPress={() => onDecision(true)} testID="consent-accept" />
      <Button label={t.consent.refuse} onPress={() => onDecision(false)} testID="consent-refuse" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  body: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  footnote: { color: colors.muted, fontSize: font.small },
});
