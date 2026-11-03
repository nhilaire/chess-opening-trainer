import { useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';

import { appName, APP_VERSION } from '../config/app';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

// « À propos »: why this game exists (story from the discovery brief), a word from the author (a passionate
// developer, free time, bugs are possible), the player's data, the version.
function Section({ title, paragraphs }: { title: string; paragraphs: readonly string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {paragraphs.map((p) => (
        <Text key={p} style={styles.paragraph}>
          {p}
        </Text>
      ))}
    </View>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t, language } = useI18n();
  // Android back returns to Home (registered last, so it runs before any app-level handler).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <Screen testID="about-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.about.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{appName(language)}</Text>
        <Section title={t.about.storyTitle} paragraphs={t.about.story} />
        <Section title={t.about.authorTitle} paragraphs={t.about.author} />
        <Section title={t.about.dataTitle} paragraphs={t.about.data} />
        <Text style={styles.version}>{t.about.version(APP_VERSION)}</Text>
      </ScrollView>
      <Button label={t.about.back} onPress={onBack} variant="secondary" testID="about-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  body: { gap: spacing.lg, paddingBottom: spacing.md },
  name: { color: colors.accent, fontSize: font.heading, fontWeight: '800' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.accent, fontSize: font.small, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  paragraph: { color: colors.text, fontSize: font.body, lineHeight: 25 },
  version: { color: colors.muted, fontSize: font.small, textAlign: 'center' },
});
