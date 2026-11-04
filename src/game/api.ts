// Openings API data -> repertoire openings (pure). Rules: docs/PRD.md "Openings API". The mock API
// (mock-api/contract.mjs) is the executable reference of the shapes.
import { Chess } from 'chess.js';

import { extractLines } from './repertoire';
import type { Color, MoveNode, MoveTree, Opening } from './types';

export interface ApiNode {
  move: string;
  name?: string;
  children?: ApiNode[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Ids of the list (a top-level array of objects with a string id); null when the shape is wrong.
export function parseList(json: unknown): string[] | null {
  if (!Array.isArray(json)) return null;
  const ids = json.map((item) => (isObject(item) && typeof item.id === 'string' && item.id ? item.id : null));
  return ids.every((id): id is string => id !== null) ? ids : null;
}

// Replays the API nodes from `fen`; SAN normalised by chess.js; sibling nodes with the same move are merged
// (children concatenated, first name kept). Null on any illegal move or wrong shape.
function toTree(nodes: unknown, fen: string): MoveTree | null {
  if (!Array.isArray(nodes)) return null;
  const out: MoveNode[] = [];
  for (const node of nodes) {
    if (!isObject(node) || typeof node.move !== 'string') return null;
    if (node.name !== undefined && typeof node.name !== 'string') return null;
    const chess = new Chess(fen);
    let san: string;
    try {
      san = chess.move(node.move).san;
    } catch {
      return null;
    }
    const children = node.children === undefined ? [] : toTree(node.children, chess.fen());
    if (!children) return null;
    const name = typeof node.name === 'string' && node.name.trim() ? node.name.trim() : undefined;
    const same = out.find((n) => n.san === san);
    if (same) {
      same.children = mergeSiblings([...same.children, ...children]);
      if (!same.comment && name) same.comment = name;
    } else out.push({ san, ...(name ? { comment: name } : {}), children });
  }
  return out;
}

function mergeSiblings(nodes: MoveNode[]): MoveNode[] {
  const out: MoveNode[] = [];
  for (const node of nodes) {
    const same = out.find((n) => n.san === node.san);
    if (!same) out.push(node);
    else {
      same.children = mergeSiblings([...same.children, ...node.children]);
      if (!same.comment && node.comment) same.comment = node.comment;
    }
  }
  return out;
}

// One opening detail; null when it is invalid (shape, colour, illegal move, no line with a player move).
export function parseDetail(json: unknown): Opening | null {
  if (!isObject(json) || typeof json.id !== 'string' || !json.id || typeof json.name !== 'string') return null;
  const color = json.playerColor;
  if (color !== 'white' && color !== 'black') return null;
  const tree = toTree(json.tree, new Chess().fen());
  if (!tree) return null;
  const opening: Opening = { id: json.id, name: json.name.trim() || json.id, color: color as Color, origin: 'api', tree };
  return extractLines(opening).length > 0 ? opening : null;
}
