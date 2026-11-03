import meta from '../../factory-app.json';
import { DICTIONARIES, FALLBACK_LANGUAGE, LANGUAGE_NAMES, LANGUAGES, resolveLanguage } from '../i18n';
import { formatter } from '../i18n/format';

// Shape of a dictionary: every key, function arity and list length (texts differ, structure must not).
function shape(value: unknown): unknown {
  if (typeof value === 'function') return `fn/${value.length}`;
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

// Every text of a dictionary (functions called with sample arguments).
function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return texts(value(...Array(value.length).fill(1)));
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

describe('languages', () => {
  it('match factory-app.json, with the reference language first and a supported fallback', () => {
    expect(LANGUAGES).toEqual(meta.languages);
    expect(LANGUAGES).toContain(FALLBACK_LANGUAGE);
    expect(FALLBACK_LANGUAGE).toBe(meta.fallbackLanguage);
    for (const language of LANGUAGES) expect(LANGUAGE_NAMES[language]).toBeTruthy();
  });

  it.each(LANGUAGES.slice(1))('%s has exactly the keys of the reference dictionary', (language) => {
    expect(shape(DICTIONARIES[language])).toEqual(shape(DICTIONARIES[LANGUAGES[0]]));
  });

  it.each(LANGUAGES.slice(1))('%s is really translated (no text left in the reference language)', (language) => {
    const reference = new Set(texts(DICTIONARIES[LANGUAGES[0]]).filter((s) => s.length > 12));
    expect(texts(DICTIONARIES[language]).filter((s) => reference.has(s))).toEqual([]);
  });

  it.each(LANGUAGES)('%s has no empty text', (language) => {
    expect(texts(DICTIONARIES[language]).filter((s) => s.trim() === '')).toEqual([]);
  });
});

describe('resolveLanguage', () => {
  it('follows the phone when the setting is automatic', () => {
    expect(resolveLanguage('auto', ['fr-FR'])).toBe('fr');
    expect(resolveLanguage('auto', ['en-GB', 'fr-FR'])).toBe('en');
    expect(resolveLanguage('auto', ['fr_CA'])).toBe('fr');
  });

  it("takes the phone's first supported language", () => {
    expect(resolveLanguage('auto', ['it-IT', 'fr-FR'])).toBe('fr');
  });

  it('falls back when no phone language is supported', () => {
    expect(resolveLanguage('auto', ['it-IT', 'de-DE'])).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage('auto', [])).toBe(FALLBACK_LANGUAGE);
  });

  it("keeps the player's explicit choice whatever the phone says", () => {
    expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
  });
});

describe('formatting', () => {
  it('French: narrow no-break space for thousands, no-break space before a colon', () => {
    const fr = formatter('fr-FR');
    expect(fr.integer(12345)).toBe('12 345');
    expect(fr.label('Score', 3)).toBe('Score : 3');
  });

  it('English: comma for thousands, no space before a colon', () => {
    const en = formatter('en-US');
    expect(en.integer(12345)).toBe('12,345');
    expect(en.label('Score', 3)).toBe('Score: 3');
  });
});
