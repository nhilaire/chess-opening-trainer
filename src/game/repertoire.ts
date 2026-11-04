// Repertoire lines: every path from the start position to a leaf of an opening's tree. Rules: docs/PRD.md
// "Repertoire model".
import type { Color, MoveNode, MoveTree, Opening } from './types';

export interface Line {
  id: string; // `${color}|${moves}`: stable across restarts and across openings (PRD "Repertoire model")
  openingId: string;
  moves: string[]; // SAN from the start position
  label?: string; // last comment met along the path
  order: number; // tree order inside the opening (depth-first, main line first, variations in PGN order)
}

export function lineId(color: Color, moves: readonly string[]): string {
  return `${color}|${moves.join(' ')}`;
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
    .map((p, order) => ({ id: lineId(opening.color, p.moves), openingId: opening.id, moves: p.moves, label: p.label, order }));
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
