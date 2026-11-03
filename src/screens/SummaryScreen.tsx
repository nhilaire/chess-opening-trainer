import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';
import { useBack } from '../ui/useBack';

type Props = { ok: number; failed: number; learnt: number; onHome: () => void };

export function SummaryScreen({ ok, failed, learnt, onHome }: Props) {
  const { t } = useI18n();
  useBack(onHome);
  return (
    <Screen testID="summary-screen">
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {t.summary.title}
        </Text>
        <Text style={styles.counts} testID="summary-counts">
          {t.summary.counts(ok, failed, learnt)}
        </Text>
      </View>
      <Button label={t.summary.home} onPress={onHome} testID="summary-home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  counts: { color: colors.muted, fontSize: font.body, textAlign: 'center' },
});
