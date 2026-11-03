// Playing one line on the board: pure reducer, chess.js for legality. Rules: docs/PRD.md "Playing a line".
// The UI dispatches `opponent` after its 400 ms delay; nothing here reads the clock.
import { Chess, Square } from 'chess.js';

import { moverAt, movesAfter, Line } from './repertoire';
import type { Mode, Outcome } from './session';
import type { Color, MoveTree } from './types';

export type { Square } from 'chess.js';
export type Promotion = 'q' | 'r' | 'b' | 'n';

export interface Arrow {
  from: Square;
  to: Square;
}

export type Prompt = 'yourMove' | 'discover' | 'playArrow' | 'wrong' | 'otherBranch' | 'answer' | 'opponent' | 'done';
export type Sound = 'move' | 'capture' | 'error' | 'success';

export interface TrainerState {
  line: Line;
  color: Color;
  mode: Mode;
  tree: MoveTree;
  ply: number; // moves already played
  fen: string;
  lastMove?: Arrow;
  arrow?: Arrow;
  tries: number; // wrong tries on the current player move
  failed: boolean;
  prompt: Prompt;
  sound?: { kind: Sound; n: number }; // n changes with every sound to play
}

export type TrainerAction =
  | { type: 'opponent' }
  | { type: 'play'; from: Square; to: Square; promotion?: Promotion };

const START = new Chess().fen();

function expectedArrow(fen: string, san: string): Arrow {
  const move = new Chess(fen).move(san);
  return { from: move.from, to: move.to };
}

function isPlayerTurn(state: Pick<TrainerState, 'ply' | 'color'>): boolean {
  return moverAt(state.ply) === state.color;
}

function soundOf(state: TrainerState, kind: Sound): TrainerState['sound'] {
  return { kind, n: (state.sound?.n ?? 0) + 1 };
}

// Prompt and arrow when the player has to move.
function playerTurn(state: TrainerState): TrainerState {
  if (state.mode === 'discover') {
    return { ...state, tries: 0, prompt: 'discover', arrow: expectedArrow(state.fen, state.line.moves[state.ply]) };
  }
  return { ...state, tries: 0, prompt: 'yourMove', arrow: undefined };
}

// After a move: the line is over, the opponent replies, or the player moves again.
function next(state: TrainerState): TrainerState {
  if (state.ply >= state.line.moves.length) {
    return { ...state, prompt: 'done', arrow: undefined, sound: state.failed ? state.sound : soundOf(state, 'success') };
  }
  return isPlayerTurn(state) ? playerTurn(state) : { ...state, prompt: 'opponent', arrow: undefined };
}

export function startLine(line: Line, color: Color, mode: Mode, tree: MoveTree): TrainerState {
  const state: TrainerState = { line, color, mode, tree, ply: 0, fen: START, tries: 0, failed: false, prompt: 'opponent' };
  return next(state);
}

function apply(state: TrainerState, san: string): TrainerState {
  const chess = new Chess(state.fen);
  const move = chess.move(san);
  const played: TrainerState = {
    ...state,
    ply: state.ply + 1,
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
    return apply(state, state.line.moves[state.ply]);
  }
  if (state.prompt === 'opponent' || state.prompt === 'done') return state;
  let san: string;
  try {
    san = new Chess(state.fen).move({ from: action.from, to: action.to, promotion: action.promotion ?? 'q' }).san;
  } catch {
    return state; // illegal: nothing happens
  }
  const expected = state.line.moves[state.ply];
  if (san === expected) return apply(state, san);
  if (state.mode === 'discover') return { ...state, prompt: 'playArrow', sound: soundOf(state, 'error') };
  if (movesAfter(state.tree, state.line.moves.slice(0, state.ply)).includes(san)) {
    return { ...state, prompt: 'otherBranch' }; // another branch of the repertoire: not a try
  }
  const tries = state.tries + 1;
  if (tries < 2) return { ...state, tries, prompt: 'wrong', sound: soundOf(state, 'error') };
  return { ...state, tries, failed: true, prompt: 'answer', arrow: expectedArrow(state.fen, expected), sound: soundOf(state, 'error') };
}

export function outcome(state: TrainerState): Outcome | undefined {
  if (state.prompt !== 'done') return undefined;
  if (state.mode === 'discover') return 'learnt';
  return state.failed ? 'failure' : 'success';
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
