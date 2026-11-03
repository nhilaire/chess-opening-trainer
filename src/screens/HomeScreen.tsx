import { StyleSheet, Text, View } from 'react-native';

import { appName } from '../config/app';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = { bestScore: number; onPlay: () => void; onSettings: () => void; onAbout: () => void };

export function HomeScreen({ bestScore, onPlay, onSettings, onAbout }: Props) {
  const { t, language } = useI18n();
  return (
    <Screen testID="home-screen">
      <View style={styles.hero}>
        <Text style={styles.title} accessibilityRole="header">
          {appName(language)}
        </Text>
        {bestScore > 0 && <Text style={styles.best}>{t.home.bestScore(bestScore)}</Text>}
      </View>
      <Button label={t.home.play} onPress={onPlay} testID="home-play" />
      <Button label={t.home.settings} onPress={onSettings} variant="secondary" testID="home-settings" />
      <Button label={t.home.about} onPress={onAbout} variant="secondary" testID="home-about" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  best: { color: colors.accent, fontSize: font.body },
});
