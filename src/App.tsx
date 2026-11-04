import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { buildQueue, QueueItem, Session, summary } from './game/session';
import type { Opening } from './game/types';
import { LanguageSetting } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import { AboutScreen } from './screens/AboutScreen';
import { DetailScreen } from './screens/DetailScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TrainingScreen } from './screens/TrainingScreen';
import { today, useRepertoire } from './state/useRepertoire';
import { loadLanguageSetting, saveLanguageSetting } from './storage/languageSetting';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

// A training session keeps the openings it started with: an API refresh during the session never changes it.
type Route =
  | { name: 'home' }
  | { name: 'detail'; id: string }
  | { name: 'training'; queue: QueueItem[]; openings: Opening[] }
  | { name: 'summary'; ok: number; failed: number; learnt: number }
  | { name: 'settings' }
  | { name: 'about' };

// No consent screen: the app collects nothing (factory-app.json firebase "none"), it opens on the home screen.
export default function App() {
  const repertoire = useRepertoire();
  const [languageReady, setLanguageReady] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('auto');

  useEffect(() => {
    let alive = true;
    (async () => {
      const storedLanguage = await loadLanguageSetting();
      if (alive) {
        setLanguageSetting(storedLanguage);
        setLanguageReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The detail screen of an opening that a refresh removed goes back to home.
  const detailGone = route.name === 'detail' && repertoire.ready && !repertoire.openings.some((o) => o.id === route.id);
  useEffect(() => {
    if (detailGone) setRoute({ name: 'home' });
  }, [detailGone]);

  const changeLanguage = useCallback(async (value: LanguageSetting) => {
    setLanguageSetting(value);
    await saveLanguageSetting(value);
  }, []);

  const home = useCallback(() => setRoute({ name: 'home' }), []);
  const endSession = useCallback((session: Session) => setRoute({ name: 'summary', ...summary(session) }), []);
  const train = (openingId?: string) => {
    const queue = buildQueue({ openings: repertoire.openings, progress: repertoire.progress, openingId });
    if (queue.length) setRoute({ name: 'training', queue, openings: repertoire.openings });
  };

  let content: React.ReactNode;
  if (!languageReady || !repertoire.ready) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (route.name === 'detail') {
    const opening = repertoire.openings.find((o) => o.id === route.id);
    content = opening ? (
      <DetailScreen opening={opening} progress={repertoire.progress} today={today()} onTrain={() => train(opening.id)} onBack={home} />
    ) : null;
  } else if (route.name === 'training') {
    content = (
      <TrainingScreen
        queue={route.queue}
        openings={route.openings}
        progress={repertoire.progress}
        feedback={repertoire.feedback}
        onLineDone={repertoire.recordLine}
        onExit={endSession}
      />
    );
  } else if (route.name === 'summary') {
    content = <SummaryScreen ok={route.ok} failed={route.failed} learnt={route.learnt} onHome={home} />;
  } else if (route.name === 'about') {
    content = <AboutScreen onBack={() => setRoute({ name: 'settings' })} />;
  } else if (route.name === 'settings') {
    content = (
      <SettingsScreen
        feedback={repertoire.feedback}
        onFeedback={repertoire.setFeedback}
        onAbout={() => setRoute({ name: 'about' })}
        onBack={home}
      />
    );
  } else {
    content = (
      <HomeScreen
        openings={repertoire.openings}
        progress={repertoire.progress}
        today={today()}
        refresh={repertoire.refresh}
        onReview={() => train()}
        onOpen={(id) => setRoute({ name: 'detail', id })}
        onSettings={() => setRoute({ name: 'settings' })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <I18nProvider setting={languageSetting} onChange={changeLanguage}>
          <ErrorBoundary>{content}</ErrorBoundary>
        </I18nProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
