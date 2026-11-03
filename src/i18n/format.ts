// Locale-aware formatting, one formatter per language dictionary.
// fr-FR: narrow no-break space (U+202F) as thousands separator, no-break space before ":" (and ";", "!", "?").
// en: comma as thousands separator, no space before ":".
// Escaped, not a literal character: a copy or an editor can silently turn a literal no-break space into a plain one.
export const NBSP = '\u00a0';

export type Formatter = {
  integer(value: number): string;
  label(text: string, value: string | number): string;
};

export function formatter(locale: string): Formatter {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const beforeColon = locale.toLowerCase().startsWith('fr') ? NBSP : '';
  const integer = (value: number) => numbers.format(value);
  return {
    integer,
    label: (text, value) => `${text}${beforeColon}: ${typeof value === 'number' ? integer(value) : value}`,
  };
}
