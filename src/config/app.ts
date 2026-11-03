// App identity comes from factory-app.json: the final app name has a single source of truth.
import meta from '../../factory-app.json';
import pkg from '../../package.json';

type Localized = { languages?: string[]; fallbackLanguage?: string; displayNames?: Record<string, string> };
const localized = meta as Localized;

export const APP_NAME: string = meta.displayName;
export const APP_PACKAGE: string = meta.package;
export const APP_VERSION: string = pkg.version;

// Languages: the first one is the reference (the language of displayName); the others have their own displayNames.
export const APP_LANGUAGES: string[] = localized.languages ?? ['fr'];
export const APP_FALLBACK_LANGUAGE: string = localized.fallbackLanguage ?? APP_LANGUAGES[0];

// Final app name in a given language (the same name everywhere unless the brief chose a translated one).
export function appName(language: string): string {
  return language === APP_LANGUAGES[0] ? APP_NAME : localized.displayNames?.[language] || APP_NAME;
}
