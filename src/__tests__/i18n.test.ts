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

describe('plurals (AC-38)', () => {
  const { fr, en } = DICTIONARIES;

  it('French uses the singular for 0 and 1', () => {
    expect([0, 1, 2].map((n) => fr.detail.lines(n))).toEqual(['0 ligne', '1 ligne', '2 lignes']);
    expect([0, 1, 2].map((n) => fr.home.review(n))).toEqual(['Réviser (0 ligne)', 'Réviser (1 ligne)', 'Réviser (2 lignes)']);
    expect(fr.home.counts(1, 2, 0)).toBe('1 maîtrisée · 2 à revoir · 0 nouvelle');
    expect(fr.summary.counts(2, 1, 1)).toBe('2 réussies · 1 à revoir · 1 nouvelle apprise');
  });

  it('English uses the singular for 1 only', () => {
    expect([0, 1, 2].map((n) => en.detail.lines(n))).toEqual(['0 lines', '1 line', '2 lines']);
    expect([0, 1, 2].map((n) => en.home.review(n))).toEqual(['Review (0 lines)', 'Review (1 line)', 'Review (2 lines)']);
    expect(en.summary.counts(1, 0, 2)).toBe('1 succeeded · 0 to review · 2 new learnt');
  });
});

describe('French typography', () => {
  it('puts a no-break space before « : ? » and inside guillemets', () => {
    const { fr } = DICTIONARIES;
    expect(fr.import.errors.illegal('5...Bxf2')).toBe('Coup illégal : 5...Bxf2');
    expect(fr.detail.deleteConfirm('Slave')).toBe('Supprimer « Slave » et ta progression ?');
    expect(texts(fr).filter((s) => / [:;!?](\s|$)/.test(s))).toEqual([]);
  });
});
