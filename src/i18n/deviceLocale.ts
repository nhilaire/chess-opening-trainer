import { getLocales } from 'expo-localization';

// The phone's preferred languages (BCP 47 tags, most preferred first), from Android's language list.
export function deviceLanguageTags(): string[] {
  try {
    return getLocales().map((locale) => locale.languageTag);
  } catch {
    return [];
  }
}
