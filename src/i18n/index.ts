// Languages of the game. Pure TypeScript (no React): language resolution is unit-tested.
// Adding a language = a new dictionary file + an entry in DICTIONARIES and LANGUAGE_NAMES + factory-app.json
// "languages" (a Jest test keeps them in sync).
import { APP_FALLBACK_LANGUAGE } from '../config/app';
import { en } from './en';
import { fr } from './fr';
import type { Strings } from './types';

export type { Strings } from './types';

export const DICTIONARIES: Record<'fr' | 'en', Strings> = { fr, en };

export type Language = keyof typeof DICTIONARIES;
export const LANGUAGES = Object.keys(DICTIONARIES) as Language[];

// Each language is named in itself, whatever the current language (players look for their own language's name).
export const LANGUAGE_NAMES: Record<Language, string> = { fr: 'Français', en: 'English' };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DICTIONARIES, value);
}

// Shown when the phone's languages are all unsupported (factory-app.json "fallbackLanguage").
export const FALLBACK_LANGUAGE: Language = isLanguage(APP_FALLBACK_LANGUAGE) ? APP_FALLBACK_LANGUAGE : LANGUAGES[0];

// 'auto' follows the phone; otherwise the player's explicit choice from the settings.
export type LanguageSetting = 'auto' | Language;

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === 'auto' || isLanguage(value);
}

// deviceTags: the phone's preferred languages, most preferred first (BCP 47: "fr-FR", "en-US", "pt-BR"...).
export function resolveLanguage(setting: LanguageSetting, deviceTags: readonly string[]): Language {
  if (setting !== 'auto') return setting;
  for (const tag of deviceTags) {
    const code = tag.split(/[-_]/)[0].toLowerCase();
    if (isLanguage(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}
