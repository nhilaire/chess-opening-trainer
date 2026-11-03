// Locale-aware formatting, one formatter per language dictionary.
// fr-FR: narrow no-break space (U+202F) as thousands separator, no-break space before ":" (and ";", "!", "?").
// en: comma as thousands separator, no space before ":".
// Escaped, not a literal character: a copy or an editor can silently turn a literal no-break space into a plain one.
export const NBSP = ' ';

export type Formatter = {
  integer(value: number): string;
  label(text: string, value: string | number): string;
  // "1 ligne" / "2 lignes": French uses the singular for 0 and 1, English for 1 only.
  count(value: number, singular: string, plural: string): string;
};

export function formatter(locale: string): Formatter {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const french = locale.toLowerCase().startsWith('fr');
  const beforeColon = french ? NBSP : '';
  const integer = (value: number) => numbers.format(value);
  return {
    integer,
    label: (text, value) => `${text}${beforeColon}: ${typeof value === 'number' ? integer(value) : value}`,
    count: (value, singular, plural) => `${integer(value)} ${(french ? value <= 1 : value === 1) ? singular : plural}`,
  };
}
