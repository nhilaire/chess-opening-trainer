// The 3 embedded openings, installed at first launch. Their displayed name follows the UI language until the
// player renames them (`name` stays empty until then).
import { EMBEDDED_OPENINGS } from '../content/embeddedOpenings';
import { parsePgn } from './pgn';
import type { EmbeddedKey, Opening } from './types';

export function embeddedOpeningId(key: EmbeddedKey): string {
  return `embedded-${key}`;
}

export function createEmbeddedOpenings(): Opening[] {
  return EMBEDDED_OPENINGS.map(({ key, color, pgn }) => {
    const parsed = parsePgn(pgn);
    if (!parsed.ok) throw new Error(`embedded opening ${key} does not parse: ${JSON.stringify(parsed.error)}`);
    return { id: embeddedOpeningId(key), name: '', embeddedKey: key, color, origin: 'embedded', tree: parsed.tree };
  });
}

// Name shown for an opening: the given name, else the localized name of an embedded opening.
export function displayName(opening: Pick<Opening, 'name' | 'embeddedKey'>, embeddedNames: Record<EmbeddedKey, string>): string {
  if (opening.name) return opening.name;
  return opening.embeddedKey ? embeddedNames[opening.embeddedKey] : '';
}
