// Repertoire lines: every path from the start position to a leaf of an opening's tree. Rules: docs/PRD.md
// "Repertoire model" and "PGN import".
import { parsePgn, PgnError, prefillName, validateName } from './pgn';
import type { Color, MoveNode, MoveTree, Opening } from './types';

export const MAX_LINES = 1000;

export interface Line {
  id: string; // `${openingId}|${moves}`: stable across restarts, unique across openings
  openingId: string;
  moves: string[]; // SAN from the start position
  label?: string; // last comment met along the path
  order: number; // tree order inside the opening (depth-first, main line first, variations in PGN order)
}

export function lineId(openingId: string, moves: readonly string[]): string {
  return `${openingId}|${moves.join(' ')}`;
}

// Move index i is White's when i is even.
export function moverAt(index: number): Color {
  return index % 2 === 0 ? 'white' : 'black';
}

export function hasPlayerMove(moves: readonly string[], color: Color): boolean {
  return moves.some((_, i) => moverAt(i) === color);
}

function leafPaths(tree: MoveTree): { moves: string[]; label?: string }[] {
  const out: { moves: string[]; label?: string }[] = [];
  const walk = (nodes: MoveNode[], moves: string[], label: string | undefined) => {
    for (const node of nodes) {
      const path = [...moves, node.san];
      const here = node.comment ?? label;
      if (node.children.length === 0) out.push({ moves: path, label: here });
      else walk(node.children, path, here);
    }
  };
  walk(tree, [], undefined);
  return out;
}

// Lines without a move of the player's colour are ignored (nothing to train).
export function extractLines(opening: Pick<Opening, 'id' | 'color' | 'tree'>): Line[] {
  return leafPaths(opening.tree)
    .filter((p) => hasPlayerMove(p.moves, opening.color))
    .map((p, order) => ({ id: lineId(opening.id, p.moves), openingId: opening.id, moves: p.moves, label: p.label, order }));
}

// Repertoire moves available after `prefix` (the children of the node it reaches; the first moves for []).
export function movesAfter(tree: MoveTree, prefix: readonly string[]): string[] {
  let nodes: MoveNode[] = tree;
  for (const san of prefix) {
    const next = nodes.find((n) => n.san === san);
    if (!next) return [];
    nodes = next.children;
  }
  return nodes.map((n) => n.san);
}

export type ImportError = PgnError | { kind: 'noPlayerMove' } | { kind: 'name' };

export type ImportResult = { ok: true; opening: Opening } | { ok: false; error: ImportError };

// Builds an imported opening from pasted PGN; nothing is created when any rule fails.
export function importOpening(text: string, name: string, color: Color, id: string): ImportResult {
  const parsed = parsePgn(text);
  if (!parsed.ok) return parsed;
  const opening: Opening = { id, name: '', color, origin: 'imported', tree: parsed.tree };
  const paths = leafPaths(parsed.tree);
  if (paths.length > MAX_LINES) return { ok: false, error: { kind: 'tooBig' } };
  if (extractLines(opening).length === 0) return { ok: false, error: { kind: 'noPlayerMove' } };
  const valid = validateName(name);
  if (!valid) return { ok: false, error: { kind: 'name' } };
  return { ok: true, opening: { ...opening, name: valid } };
}

// Name suggested on the import screen once a PGN is pasted (empty when the text is not a valid PGN).
export function suggestedName(text: string): string {
  const parsed = parsePgn(text);
  return parsed.ok ? prefillName(parsed.tags) : '';
}
