import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LanguageSetting } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import { AboutScreen } from './screens/AboutScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { loadLanguageSetting, saveLanguageSetting } from './storage/languageSetting';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

type Route = 'home' | 'settings' | 'about';

// No consent screen: the app collects nothing (factory-app.json firebase "none"), it opens on the home screen.
export default function App() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>('home');
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('auto');

  useEffect(() => {
    let alive = true;
    (async () => {
      const storedLanguage = await loadLanguageSetting();
      if (alive) {
        setLanguageSetting(storedLanguage);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const changeLanguage = useCallback(async (value: LanguageSetting) => {
    setLanguageSetting(value);
    await saveLanguageSetting(value);
  }, []);

  let content: React.ReactNode;
  if (!ready) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (route === 'about') {
    content = <AboutScreen onBack={() => setRoute('home')} />;
  } else if (route === 'settings') {
    content = <SettingsScreen onBack={() => setRoute('home')} />;
  } else {
    content = <HomeScreen onSettings={() => setRoute('settings')} onAbout={() => setRoute('about')} />;
  }

  return (
    <I18nProvider setting={languageSetting} onChange={changeLanguage}>
      <ErrorBoundary>{content}</ErrorBoundary>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
