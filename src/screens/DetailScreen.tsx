import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayName } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import { countLines, Progress } from '../game/scheduler';
import type { Opening } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font } from '../ui/theme';
import { useBack } from '../ui/useBack';

type Props = {
  opening: Opening;
  progress: Progress;
  today: string;
  onTrain: () => void;
  onBack: () => void;
};

// Read-only: openings are managed in the web editor (PRD v0.3.0).
export function DetailScreen({ opening, progress, today, onTrain, onBack }: Props) {
  const { t } = useI18n();
  const name = displayName(opening, t.openings);
  const counts = useMemo(() => countLines(extractLines(opening), progress, today), [opening, progress, today]);
  const canTrain = counts.total > 0;
  useBack(onBack);

  return (
    <Screen testID="detail-screen">
      <Text style={styles.title} accessibilityRole="header" testID="detail-name">
        {name}
      </Text>
      <Text style={styles.meta}>
        {t.color[opening.color]} · {t.detail.lines(counts.total)}
      </Text>
      <Text style={styles.meta}>{t.home.counts(counts.mastered, counts.due, counts.fresh)}</Text>
      <View style={styles.spacer} />
      <Button label={canTrain ? t.detail.train : t.home.nothing} onPress={onTrain} disabled={!canTrain} testID="detail-train" />
      <Button label={t.common.back} onPress={onBack} variant="secondary" testID="detail-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: font.body },
  spacer: { flex: 1 },
});
