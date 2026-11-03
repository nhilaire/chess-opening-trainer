import { parsePgn } from '../game/pgn';
import { extractLines } from '../game/repertoire';
import { legalTargets, needsPromotion, outcome, piecesOf, reduce, Square, startLine, TrainerState } from '../game/trainer';
import type { Color, MoveTree } from '../game/types';

function tree(pgn: string): MoveTree {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return parsed.tree;
}

function setup(pgn: string, color: Color, mode: 'discover' | 'review', lineIndex = 0): TrainerState {
  const t = tree(pgn);
  const line = extractLines({ id: 'o', color, tree: t })[lineIndex];
  return startLine(line, color, mode, t);
}

const play = (s: TrainerState, from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') =>
  reduce(s, { type: 'play', from: from as Square, to: to as Square, promotion });
const opponent = (s: TrainerState) => reduce(s, { type: 'opponent' });

// White repertoire: 1. d4 d5 2. c4, with 2. Nf3 as another branch.
const WHITE = '1. d4 d5 2. c4 (2. Nf3 Nf6) e6 *';

describe('start of a line (AC-21)', () => {
  it('with White, the player moves first', () => {
    const s = setup(WHITE, 'white', 'review');
    expect(s.prompt).toBe('yourMove');
    expect(s.ply).toBe(0);
  });

  it('with Black, the app plays White first', () => {
    const s = setup('1. e4 d5 2. exd5 Qxd5 *', 'black', 'review');
    expect(s.prompt).toBe('opponent');
    const after = opponent(s);
    expect(after.line.moves[0]).toBe('e4');
    expect(after.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(after.prompt).toBe('yourMove');
  });
});

describe('review mode (AC-22)', () => {
  it('accepts the line move, then the opponent replies, until the end', () => {
    let s = setup(WHITE, 'white', 'review');
    s = play(s, 'd2', 'd4');
    expect(s.prompt).toBe('opponent');
    s = opponent(s);
    expect(s.prompt).toBe('yourMove');
    s = play(s, 'c2', 'c4');
    s = opponent(s);
    expect(s.prompt).toBe('done');
    expect(outcome(s)).toBe('success');
    expect(s.sound?.kind).toBe('success');
  });

  it('another repertoire move from the position is « good move, not this line », not a try', () => {
    let s = opponent(play(setup(WHITE, 'white', 'review'), 'd2', 'd4'));
    s = play(s, 'g1', 'f3'); // 2. Nf3 is the other branch
    expect(s.prompt).toBe('otherBranch');
    expect(s.tries).toBe(0);
    expect(s.ply).toBe(2);
    s = play(s, 'e2', 'e4'); // first real mistake: still a retry
    expect(s.prompt).toBe('wrong');
  });

  it('first wrong move: retry; second: arrow, line failed, the arrow move must be played', () => {
    let s = setup(WHITE, 'white', 'review');
    s = play(s, 'e2', 'e4');
    expect(s.prompt).toBe('wrong');
    expect(s.ply).toBe(0);
    expect(s.sound?.kind).toBe('error');
    s = play(s, 'e2', 'e3');
    expect(s.prompt).toBe('answer');
    expect(s.failed).toBe(true);
    expect(s.arrow).toEqual({ from: 'd2', to: 'd4' });
    s = play(s, 'd2', 'd4');
    s = opponent(s);
    s = play(s, 'c2', 'c4');
    s = opponent(s);
    expect(outcome(s)).toBe('failure');
  });

  it('an illegal move changes nothing', () => {
    const s = setup(WHITE, 'white', 'review');
    expect(play(s, 'd2', 'd5')).toBe(s);
    expect(play(s, 'e7', 'e5')).toBe(s); // not the player's piece
  });

  it('ignores moves while the opponent is to play or when the line is over', () => {
    const s = play(setup(WHITE, 'white', 'review'), 'd2', 'd4');
    expect(play(s, 'd7', 'd5')).toBe(s);
  });
});

describe('discovery mode (AC-23)', () => {
  it('shows an arrow on each player move, accepts only that move, cannot fail', () => {
    let s = setup(WHITE, 'white', 'discover');
    expect(s.prompt).toBe('discover');
    expect(s.arrow).toEqual({ from: 'd2', to: 'd4' });
    s = play(s, 'e2', 'e4');
    expect(s.prompt).toBe('playArrow');
    s = play(s, 'g1', 'f3');
    expect(s.prompt).toBe('playArrow');
    expect(s.failed).toBe(false);
    s = opponent(play(s, 'd2', 'd4'));
    expect(s.arrow).toEqual({ from: 'c2', to: 'c4' });
    s = opponent(play(s, 'c2', 'c4'));
    expect(outcome(s)).toBe('learnt');
  });
});

describe('promotion (AC-24)', () => {
  const PROMO = '1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6 5. bxa8=N *';

  it('applies the chosen piece and compares it with the line SAN', () => {
    let s = setup(PROMO, 'white', 'review');
    for (const [from, to] of [['a2', 'a4'], ['a4', 'b5'], ['b5', 'a6'], ['a6', 'b7']]) s = opponent(play(s, from, to));
    expect(needsPromotion(s.fen, 'b7', 'a8')).toBe(true);
    expect(needsPromotion(s.fen, 'b1', 'c3')).toBe(false);
    const queen = play(s, 'b7', 'a8', 'q');
    expect(queen.prompt).toBe('wrong');
    const knight = play(s, 'b7', 'a8', 'n');
    expect(knight.prompt).toBe('done');
    expect(piecesOf(knight.fen).find((p) => p.square === 'a8')).toEqual({ square: 'a8', color: 'w', type: 'n' });
  });
});

describe('board helpers', () => {
  it('lists legal destinations of a piece', () => {
    const s = setup(WHITE, 'white', 'review');
    expect(legalTargets(s.fen, 'g1').sort()).toEqual(['f3', 'h3']);
    expect(legalTargets(s.fen, 'e4')).toEqual([]);
    expect(piecesOf(s.fen)).toHaveLength(32);
  });
});
