// Changes to the list of openings (pure): add, rename, delete with its lines' progress.
import { lineId } from './repertoire';
import type { Progress } from './scheduler';
import type { Opening } from './types';

export function addOpening(openings: readonly Opening[], opening: Opening): Opening[] {
  return [...openings, opening]; // imported openings go after the others, in import order
}

export function renameOpening(openings: readonly Opening[], id: string, name: string): Opening[] {
  return openings.map((o) => (o.id === id ? { ...o, name } : o));
}

export function deleteOpening(openings: readonly Opening[], progress: Progress, id: string): { openings: Opening[]; progress: Progress } {
  const prefix = lineId(id, []);
  return {
    openings: openings.filter((o) => o.id !== id),
    progress: Object.fromEntries(Object.entries(progress).filter(([key]) => !key.startsWith(prefix))),
  };
}
