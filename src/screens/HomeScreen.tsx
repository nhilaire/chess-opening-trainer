import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { appName } from '../config/app';
import { displayName } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import { countLines, DailyNew, Progress, reviewCount } from '../game/scheduler';
import type { Opening } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  openings: Opening[];
  progress: Progress;
  daily?: DailyNew;
  today: string;
  onReview: () => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onSettings: () => void;
};

export function HomeScreen({ openings, progress, daily, today, onReview, onOpen, onAdd, onSettings }: Props) {
  const { t, language } = useI18n();
  const rows = useMemo(
    () => openings.map((opening) => ({ opening, counts: countLines(extractLines(opening), progress, today) })),
    [openings, progress, today],
  );
  const toReview = useMemo(() => reviewCount(openings.flatMap((o) => extractLines(o)), progress, daily, today), [openings, progress, daily, today]);

  return (
    <Screen testID="home-screen">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {appName(language)}
        </Text>
        <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel={t.home.settings} testID="home-settings" hitSlop={12}>
          <Text style={styles.settings}>{t.home.settings}</Text>
        </Pressable>
      </View>
      <Button
        label={toReview > 0 ? t.home.review(toReview) : t.home.nothing}
        onPress={onReview}
        disabled={toReview === 0}
        testID="home-review"
      />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.length === 0 && (
          <Text style={styles.empty} testID="home-empty">
            {t.home.empty}
          </Text>
        )}
        {rows.map(({ opening, counts }) => {
          const name = displayName(opening, t.openings);
          return (
            <Pressable
              key={opening.id}
              testID={`home-opening-${opening.id}`}
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => onOpen(opening.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.swatch, opening.color === 'white' ? styles.white : styles.black]} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.meta}>
                  {t.color[opening.color]} · {t.home.counts(counts.mastered, counts.due, counts.fresh)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Button label={t.home.add} onPress={onAdd} variant="secondary" testID="home-add" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800', flexShrink: 1 },
  settings: { color: colors.muted, fontSize: font.body, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  empty: { color: colors.muted, fontSize: font.body, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  pressed: { opacity: 0.8 },
  swatch: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.muted },
  white: { backgroundColor: '#f0d9b5' },
  black: { backgroundColor: '#1E1C1A' },
  rowText: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: font.small },
});
