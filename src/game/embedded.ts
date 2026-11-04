// The 3 embedded openings: the offline seed stored at first launch, replaced by the openings API as soon as it
// answers. They carry the API ids; their displayed name follows the UI language (`name` stays empty).
import { EMBEDDED_OPENINGS } from '../content/embeddedOpenings';
import { parsePgn } from './pgn';
import type { EmbeddedKey, Opening } from './types';

export const EMBEDDED_IDS: Record<EmbeddedKey, string> = {
  d4: 'ouvertures-en-d4',
  scandinavian: 'defense-scandinave',
  d4Black: 'ouvertures-d4-noirs',
};

export function embeddedOpeningId(key: EmbeddedKey): string {
  return EMBEDDED_IDS[key];
}

export function createEmbeddedOpenings(): Opening[] {
  return EMBEDDED_OPENINGS.map(({ key, color, pgn }) => {
    const parsed = parsePgn(pgn);
    if (!parsed.ok) throw new Error(`embedded opening ${key} does not parse: ${JSON.stringify(parsed.error)}`);
    return { id: embeddedOpeningId(key), name: '', embeddedKey: key, color, origin: 'embedded', tree: parsed.tree };
  });
}

// Name shown for an opening: the API name, else the localized name of an embedded opening.
export function displayName(opening: Pick<Opening, 'name' | 'embeddedKey'>, embeddedNames: Record<EmbeddedKey, string>): string {
  if (opening.name) return opening.name;
  return opening.embeddedKey ? embeddedNames[opening.embeddedKey] : '';
}
