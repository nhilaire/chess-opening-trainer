import AsyncStorage from '@react-native-async-storage/async-storage';

import { isLanguageSetting, LanguageSetting } from '../i18n';
import { reportError } from '../telemetry/telemetry';

const KEY = 'settings.language.v1';

// 'auto' (follow the phone) until the player picks a language in the settings.
export async function loadLanguageSetting(): Promise<LanguageSetting> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return isLanguageSetting(value) ? value : 'auto';
  } catch (error) {
    reportError(error, 'load_language');
    return 'auto';
  }
}

export async function saveLanguageSetting(value: LanguageSetting): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, value);
  } catch (error) {
    reportError(error, 'save_language');
  }
}
