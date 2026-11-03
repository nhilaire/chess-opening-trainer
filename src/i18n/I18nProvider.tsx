import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { deviceLanguageTags } from './deviceLocale';
import { DICTIONARIES, Language, LanguageSetting, resolveLanguage, Strings } from './index';

type I18n = {
  language: Language;
  setting: LanguageSetting;
  t: Strings;
  setSetting: (setting: LanguageSetting) => void;
};

const startLanguage = resolveLanguage('auto', deviceLanguageTags());

const I18nContext = createContext<I18n>({
  language: startLanguage,
  setting: 'auto',
  t: DICTIONARIES[startLanguage],
  setSetting: () => {},
});

// The phone's language is read at start and again each time the app comes back to the foreground (the player may
// have changed it in Android settings meanwhile). The explicit choice from the settings screen wins over it.
export function I18nProvider({ setting, onChange, children }: { setting: LanguageSetting; onChange: (setting: LanguageSetting) => void; children: ReactNode }) {
  const [deviceTags, setDeviceTags] = useState(deviceLanguageTags);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDeviceTags(deviceLanguageTags());
    });
    // Optional chaining: Jest mocks of AppState.addEventListener may return nothing.
    return () => sub?.remove();
  }, []);

  const value = useMemo(() => {
    const language = resolveLanguage(setting, deviceTags);
    return { language, setting, t: DICTIONARIES[language], setSetting: onChange };
  }, [setting, deviceTags, onChange]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

export { I18nContext };
