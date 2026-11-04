import { parsePgn } from '../game/pgn';
import { extractLines } from '../game/repertoire';
import { labelOf, legalTargets, needsPromotion, opponentMove, outcome, piecesOf, reachedLine, reduce, Square, startLine, TrainerState } from '../game/trainer';
import type { Color, MoveTree } from '../game/types';

function tree(pgn: string): MoveTree {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return parsed.tree;
}

function setup(pgn: string, color: Color, mode: 'discover' | 'review', lineIndex = 0, finished: string[] = []): TrainerState {
  const t = tree(pgn);
  const line = extractLines({ id: 'o', color, tree: t })[lineIndex];
  return startLine(line, color, mode, t, finished);
}

const play = (s: TrainerState, from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') =>
  reduce(s, { type: 'play', from: from as Square, to: to as Square, promotion });
const opponent = (s: TrainerState, random = 0) => reduce(s, { type: 'opponent', random });

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

  it('another repertoire move is accepted and the line continues in that branch (AC-46)', () => {
    let s = opponent(play(setup(WHITE, 'white', 'review'), 'd2', 'd4')); // target: d4 d5 c4 e6
    s = play(s, 'g1', 'f3'); // 2. Nf3, the other branch
    expect(s.prompt).toBe('opponent');
    expect(s.tries).toBe(0);
    s = opponent(s);
    expect(s.path).toEqual(['d4', 'd5', 'Nf3', 'Nf6']);
    expect(outcome(s)).toBe('success');
    const reached = reachedLine(s)!;
    expect(reached.id).toBe('white|d4 d5 Nf3 Nf6');
    expect(reached.id).not.toBe(s.line.id);
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
    expect(s.arrows).toEqual([{ from: 'd2', to: 'd4' }]);
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
    expect(s.arrows).toEqual([{ from: 'd2', to: 'd4' }]);
    s = play(s, 'e2', 'e4');
    expect(s.prompt).toBe('playArrow');
    s = play(s, 'g1', 'f3'); // a repertoire move, but not the one shown
    expect(s.prompt).toBe('playArrow');
    expect(s.failed).toBe(false);
    s = opponent(play(s, 'd2', 'd4'));
    expect(s.arrows).toEqual([{ from: 'c2', to: 'c4' }]);
    s = opponent(play(s, 'c2', 'c4'));
    expect(outcome(s)).toBe('learnt');
  });
});

describe('several repertoire moves for the player (AC-46, AC-22)', () => {
  // After 1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Bb4, White may play 5. cxd5 (Ragozin) or 5. Bg5.
  const QGD = '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Bb4 5. cxd5 { Ragozin } (5. Bg5 { Bg5 } h6 6. Bxf6 Qxf6) 5... exd5 *';
  const toMove5 = (s: TrainerState) => {
    for (const [from, to] of [['d2', 'd4'], ['c2', 'c4'], ['b1', 'c3'], ['g1', 'f3']]) s = opponent(play(s, from, to));
    return s;
  };

  it('accepts either move and continues in the chosen branch; the leaf reached is the finished line', () => {
    const ragozin = toMove5(setup(QGD, 'white', 'review', 1)); // target: the Bg5 line
    const viaCxd5 = opponent(play(ragozin, 'c4', 'd5'));
    expect(viaCxd5.prompt).toBe('done');
    expect(reachedLine(viaCxd5)).toMatchObject({ id: 'white|d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 cxd5 exd5', label: 'Ragozin' });
    const viaBg5 = opponent(opponent(play(play(toMove5(setup(QGD, 'white', 'review', 0)), 'c1', 'g5'), 'g5', 'f6')));
    expect(viaBg5.path.slice(8)).toEqual(['Bg5', 'h6']);
  });

  it('after the second wrong move, shows an arrow on every repertoire move', () => {
    let s = toMove5(setup(QGD, 'white', 'review'));
    s = play(play(s, 'a2', 'a3'), 'h2', 'h3');
    expect(s.prompt).toBe('answer');
    expect(s.arrows).toEqual([{ from: 'c4', to: 'd5' }, { from: 'c1', to: 'g5' }]);
  });

  it('labels a path with the last name met', () => {
    expect(labelOf(tree(QGD), ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'Bb4', 'Bg5', 'h6'])).toBe('Bg5');
    expect(labelOf(tree(QGD), ['d4'])).toBeUndefined();
  });
});

describe('opponent choice off the target (AC-47)', () => {
  // Black repertoire: after 1. e4 the opponent... here White is the opponent with 3 branches after 1. e4 c5:
  // 2. Nf3 (2 lines under it), 2. Nc3 (1 line), 2. c3 (1 line).
  const SICI = '1. e4 c5 2. Nf3 (2. Nc3 Nc6) (2. c3 Nf6) 2... d6 (2... Nc6) *';

  it('follows the target while on its path', () => {
    const s = setup(SICI, 'black', 'review', 2); // target 2. Nc3 Nc6
    expect(opponentMove(s, 0.99)).toBe('e4');
    expect(opponentMove(play(opponent(s), 'c7', 'c5'), 0.99)).toBe('Nc3');
  });

  it('draws with weights = lines not finished in the session, all lines when none is left', () => {
    // Off target: a target outside this tree, so the walk is free from the first move.
    const free = (finished: string[]) => {
      const base = setup(SICI, 'black', 'review', 0, finished);
      return { ...base, line: { ...base.line, moves: [] }, prompt: 'opponent' as const };
    };
    let s = opponent(free([]));
    s = play(s, 'c7', 'c5');
    expect(s.prompt).toBe('opponent');
    // 4 lines: Nf3 2, Nc3 1, c3 1 -> [0, .5) Nf3, [.5, .75) Nc3, [.75, 1) c3.
    expect([0, 0.49, 0.5, 0.74, 0.75, 0.99].map((r) => opponentMove(s, r))).toEqual(['Nf3', 'Nf3', 'Nc3', 'Nc3', 'c3', 'c3']);
    const done = ['black|e4 c5 Nf3 d6', 'black|e4 c5 Nf3 Nc6', 'black|e4 c5 c3 Nf6'];
    const s2 = { ...s, finished: done };
    expect([0, 0.5, 0.99].map((r) => opponentMove(s2, r))).toEqual(['Nc3', 'Nc3', 'Nc3']);
    const s3 = { ...s, finished: [...done, 'black|e4 c5 Nc3 Nc6'] };
    expect(opponentMove(s3, 0)).toBe('Nf3');
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
