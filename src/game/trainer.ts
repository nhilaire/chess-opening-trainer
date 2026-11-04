// Playing one line on the board: pure reducer, chess.js for legality. Rules: docs/PRD.md "Playing a line".
// In review the player may take any repertoire move: the walk follows the tree, the opponent follows the target
// line while on its path, then draws a branch (random source in the action). The UI dispatches `opponent` after
// its 400 ms delay; nothing here reads the clock or Math.random.
import { Chess, Square } from 'chess.js';

import { lineId, moverAt, Line } from './repertoire';
import type { Mode, Outcome } from './session';
import type { Color, MoveNode, MoveTree } from './types';

export type { Square } from 'chess.js';
export type Promotion = 'q' | 'r' | 'b' | 'n';

export interface Arrow {
  from: Square;
  to: Square;
}

export type Prompt = 'yourMove' | 'discover' | 'playArrow' | 'wrong' | 'answer' | 'opponent' | 'done';
export type Sound = 'move' | 'capture' | 'error' | 'success';

export interface TrainerState {
  line: Line; // the target line of the queue item
  color: Color;
  mode: Mode;
  tree: MoveTree;
  finished: readonly string[]; // ids of the lines already finished in the session (opponent weighting)
  path: string[]; // moves played from the start position
  ply: number; // = path.length
  fen: string;
  lastMove?: Arrow;
  arrows: Arrow[]; // discovery: the move to play; after the 2nd error: every repertoire move
  tries: number; // wrong tries on the current player move
  failed: boolean;
  prompt: Prompt;
  sound?: { kind: Sound; n: number }; // n changes with every sound to play
}

export type TrainerAction =
  | { type: 'opponent'; random?: number } // uniform in [0, 1)
  | { type: 'play'; from: Square; to: Square; promotion?: Promotion };

const START = new Chess().fen();

function arrowOf(fen: string, san: string): Arrow {
  const move = new Chess(fen).move(san);
  return { from: move.from, to: move.to };
}

// Children of the node reached by `path` (the first moves for []).
function nodesAt(tree: MoveTree, path: readonly string[]): MoveNode[] {
  let nodes: MoveNode[] = tree;
  for (const san of path) {
    const next = nodes.find((n) => n.san === san);
    if (!next) return [];
    nodes = next.children;
  }
  return nodes;
}

function leafPaths(node: MoveNode, prefix: string[]): string[][] {
  const path = [...prefix, node.san];
  return node.children.length ? node.children.flatMap((c) => leafPaths(c, path)) : [path];
}

function onTarget(state: Pick<TrainerState, 'path' | 'line'>): boolean {
  return state.path.every((san, i) => state.line.moves[i] === san) && state.path.length < state.line.moves.length;
}

// Opponent move: the target's while on its path, else a branch drawn with weights = lines under it not finished in
// the session (all its lines when none is left).
export function opponentMove(state: TrainerState, random = 0): string {
  if (onTarget(state)) return state.line.moves[state.ply];
  const nodes = nodesAt(state.tree, state.path);
  const leaves = nodes.map((n) => leafPaths(n, state.path));
  let weights = leaves.map((ls) => ls.filter((moves) => !state.finished.includes(lineId(state.color, moves))).length);
  if (weights.every((w) => w === 0)) weights = leaves.map((ls) => ls.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.min(Math.max(random, 0), 0.999999) * total;
  for (let i = 0; i < nodes.length; i++) {
    if (x < weights[i]) return nodes[i].san;
    x -= weights[i];
  }
  return nodes[nodes.length - 1].san;
}

function isPlayerTurn(state: Pick<TrainerState, 'ply' | 'color'>): boolean {
  return moverAt(state.ply) === state.color;
}

function soundOf(state: TrainerState, kind: Sound): TrainerState['sound'] {
  return { kind, n: (state.sound?.n ?? 0) + 1 };
}

// Prompt and arrows when the player has to move.
function playerTurn(state: TrainerState): TrainerState {
  if (state.mode === 'discover') {
    return { ...state, tries: 0, prompt: 'discover', arrows: [arrowOf(state.fen, state.line.moves[state.ply])] };
  }
  return { ...state, tries: 0, prompt: 'yourMove', arrows: [] };
}

// After a move: the line is over (leaf reached), the opponent replies, or the player moves again.
function next(state: TrainerState): TrainerState {
  if (nodesAt(state.tree, state.path).length === 0) {
    return { ...state, prompt: 'done', arrows: [], sound: state.failed ? state.sound : soundOf(state, 'success') };
  }
  return isPlayerTurn(state) ? playerTurn(state) : { ...state, prompt: 'opponent', arrows: [] };
}

export function startLine(line: Line, color: Color, mode: Mode, tree: MoveTree, finished: readonly string[] = []): TrainerState {
  const state: TrainerState = { line, color, mode, tree, finished, path: [], ply: 0, fen: START, arrows: [], tries: 0, failed: false, prompt: 'opponent' };
  return next(state);
}

function apply(state: TrainerState, san: string): TrainerState {
  const chess = new Chess(state.fen);
  const move = chess.move(san);
  const path = [...state.path, move.san];
  const played: TrainerState = {
    ...state,
    path,
    ply: path.length,
    fen: chess.fen(),
    lastMove: { from: move.from, to: move.to },
    sound: soundOf(state, move.captured ? 'capture' : 'move'),
  };
  return next(played);
}

// An illegal move returns the same state; a rejected one changes the prompt only (the board snaps back).
export function reduce(state: TrainerState, action: TrainerAction): TrainerState {
  if (action.type === 'opponent') {
    if (state.prompt !== 'opponent') return state;
    return apply(state, opponentMove(state, action.random));
  }
  if (state.prompt === 'opponent' || state.prompt === 'done') return state;
  let san: string;
  try {
    san = new Chess(state.fen).move({ from: action.from, to: action.to, promotion: action.promotion ?? 'q' }).san;
  } catch {
    return state; // illegal: nothing happens
  }
  if (state.mode === 'discover') {
    if (san === state.line.moves[state.ply]) return apply(state, san);
    return { ...state, prompt: 'playArrow', sound: soundOf(state, 'error') };
  }
  const expected = nodesAt(state.tree, state.path).map((n) => n.san);
  if (expected.includes(san)) return apply(state, san); // any repertoire move: the walk follows that branch
  const tries = state.tries + 1;
  if (tries < 2) return { ...state, tries, prompt: 'wrong', sound: soundOf(state, 'error') };
  return { ...state, tries, failed: true, prompt: 'answer', arrows: expected.map((m) => arrowOf(state.fen, m)), sound: soundOf(state, 'error') };
}

export function outcome(state: TrainerState): Outcome | undefined {
  if (state.prompt !== 'done') return undefined;
  if (state.mode === 'discover') return 'learnt';
  return state.failed ? 'failure' : 'success';
}

// The line finished: the leaf reached (the target in discovery). Undefined before the end.
export function reachedLine(state: TrainerState): Line | undefined {
  if (state.prompt !== 'done') return undefined;
  if (state.path.join(' ') === state.line.moves.join(' ')) return state.line;
  return { id: lineId(state.color, state.path), openingId: state.line.openingId, moves: state.path, label: labelOf(state.tree, state.path), order: -1 };
}

// Last name met along a path (undefined when none).
export function labelOf(tree: MoveTree, path: readonly string[]): string | undefined {
  let nodes: MoveNode[] = tree;
  let label: string | undefined;
  for (const san of path) {
    const node = nodes.find((n) => n.san === san);
    if (!node) break;
    label = node.comment ?? label;
    nodes = node.children;
  }
  return label;
}

// Board helpers.
export function legalTargets(fen: string, from: Square): Square[] {
  return new Chess(fen).moves({ square: from, verbose: true }).map((m) => m.to);
}

export function needsPromotion(fen: string, from: Square, to: Square): boolean {
  return new Chess(fen).moves({ square: from, verbose: true }).some((m) => m.to === to && Boolean(m.promotion));
}

export type BoardPiece = { square: Square; color: 'w' | 'b'; type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' };

export function piecesOf(fen: string): BoardPiece[] {
  return new Chess(fen)
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ square: p.square, color: p.color, type: p.type }));
}

export function sideToMove(fen: string): 'w' | 'b' {
  return new Chess(fen).turn();
}
