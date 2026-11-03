// PGN parser: one or several games (a Lichess / chess.com study export) merged into one move tree.
// Pure TypeScript; chess.js checks legality and normalises SAN. Rules: docs/PRD.md "PGN import".
import { Chess } from 'chess.js';

import type { MoveNode, MoveTree } from './types';

export const MAX_PGN_CHARS = 100_000;
export const MAX_LABEL_CHARS = 40;

export type PgnError =
  | { kind: 'empty' }
  | { kind: 'tooBig' }
  | { kind: 'fen' }
  | { kind: 'illegal'; move: string };

export type PgnResult = { ok: true; tree: MoveTree; tags: Record<string, string>[] } | { ok: false; error: PgnError };

const TAG_LINE = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/;
const TOKEN = /\{[^}]*\}|;[^\n]*|\(|\)|\$\d+|1-0|0-1|1\/2-1\/2|\*|\d+\.+|[^\s(){};]+/g;
const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/;
const MOVE_NUMBER = /^\d+\.+$/;
const NAG = /^\$\d+$/;
const ANNOTATION = /^[!?]+$/;

type Game = { tags: Record<string, string>; movetext: string };

// Comment → label: `[%cal ...]`-style commands removed, whitespace collapsed, empty dropped, long ones cut.
export function cleanComment(raw: string): string | undefined {
  const text = raw.replace(/\[%[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > MAX_LABEL_CHARS ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…` : text;
}

// Splits the text into games: a tag section after some movetext starts a new game (a result token inside the
// movetext also restarts from the start position, see addGame).
function splitGames(text: string): Game[] {
  const games: Game[] = [];
  let current: Game = { tags: {}, movetext: '' };
  const flush = () => {
    if (current.movetext.trim() || Object.keys(current.tags).length) games.push(current);
    current = { tags: {}, movetext: '' };
  };
  for (const line of text.split(/\r?\n/)) {
    const tag = TAG_LINE.exec(line);
    if (tag) {
      if (current.movetext.trim()) flush();
      current.tags[tag[1]] = tag[2].replace(/\\(.)/g, '$1');
    } else {
      current.movetext += `${line}\n`;
    }
  }
  flush();
  return games;
}

function normaliseToken(token: string): string {
  return token.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O').replace(/[!?]+$/, '');
}

function moveLabel(fen: string, san: string): string {
  const [, side, , , , fullmove] = fen.split(' ');
  return side === 'w' ? `${fullmove}.${san}` : `${fullmove}...${san}`;
}

type Cursor = {
  list: MoveNode[]; // where the next move goes
  fen: string; // position before the next move
  prevList: MoveNode[] | null; // where the last move went (a variation is an alternative to it)
  prevFen: string | null;
  last: MoveNode | null;
  pendingComment?: string;
};

function addGame(root: MoveTree, movetext: string): PgnError | null {
  const chess = new Chess();
  const start = chess.fen();
  let cursor: Cursor = { list: root, fen: start, prevList: null, prevFen: null, last: null };
  const stack: Cursor[] = [];

  for (const token of movetext.match(TOKEN) ?? []) {
    if (RESULT.test(token)) {
      // End of a game: games pasted without tags between them still start from the start position.
      cursor = { list: root, fen: start, prevList: null, prevFen: null, last: null };
      stack.length = 0;
      continue;
    }
    if (token.startsWith(';') || MOVE_NUMBER.test(token) || NAG.test(token) || ANNOTATION.test(token)) continue;
    if (token.startsWith('{')) {
      const comment = cleanComment(token.slice(1, -1));
      if (!comment) continue;
      if (cursor.last) cursor.last.comment = comment;
      else cursor.pendingComment = comment;
      continue;
    }
    if (token === '(') {
      // A variation replaces the last move: it starts from the position before it. Lenient on a stray "(".
      if (!cursor.last || !cursor.prevList || !cursor.prevFen) continue;
      stack.push(cursor);
      cursor = { list: cursor.prevList, fen: cursor.prevFen, prevList: null, prevFen: null, last: null };
      continue;
    }
    if (token === ')') {
      cursor = stack.pop() ?? cursor;
      continue;
    }
    const san = normaliseToken(token);
    // Loading a FEN is the slow part: only needed when a variation or a new game moved the cursor.
    if (chess.fen() !== cursor.fen) chess.load(cursor.fen);
    let played: string;
    try {
      played = chess.move(san, { strict: false }).san;
    } catch {
      return { kind: 'illegal', move: moveLabel(cursor.fen, san) };
    }
    let node = cursor.list.find((n) => n.san === played);
    if (!node) {
      node = { san: played, children: [] };
      cursor.list.push(node);
    }
    if (cursor.pendingComment) node.comment = cursor.pendingComment;
    cursor = { list: node.children, fen: chess.fen(), prevList: cursor.list, prevFen: cursor.fen, last: node };
  }
  return null;
}

export function parsePgn(text: string): PgnResult {
  if (text.length > MAX_PGN_CHARS) return { ok: false, error: { kind: 'tooBig' } };
  if (!text.trim()) return { ok: false, error: { kind: 'empty' } };
  const games = splitGames(text);
  if (games.some((g) => 'FEN' in g.tags || 'SetUp' in g.tags)) return { ok: false, error: { kind: 'fen' } };
  const tree: MoveTree = [];
  for (const game of games) {
    const error = addGame(tree, game.movetext);
    if (error) return { ok: false, error };
  }
  if (tree.length === 0) return { ok: false, error: { kind: 'empty' } };
  return { ok: true, tree, tags: games.map((g) => g.tags) };
}

// Name prefill: ChapterName of the first game, else StudyName, else Event unless it is "?", else empty.
export function prefillName(tags: Record<string, string>[]): string {
  const first = tags[0] ?? {};
  const candidate = first.ChapterName || first.StudyName || (first.Event && first.Event !== '?' ? first.Event : '');
  return (candidate ?? '').trim().slice(0, MAX_LABEL_CHARS);
}

// Opening name rule (import and rename): 1-40 characters after trimming. Returns the trimmed name or null.
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_LABEL_CHARS ? trimmed : null;
}
