import { Chess } from 'chess.js';

import { parsePgn } from '../game/pgn';
import { extractLines, lineId, movesAfter } from '../game/repertoire';
import type { Color, Opening } from '../game/types';

function opening(pgn: string, color: Color, id = 'o1'): Opening {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return { id, name: 'Test', color, origin: 'api', tree: parsed.tree };
}

describe('extractLines (AC-06)', () => {
  const o = opening('1. d4 d5 2. c4 { QGD } e6 (2... c6 { Slav } 3. Nf3) (2... dxc4) 3. Nc3 *', 'white');

  it('gives one line per leaf, in tree order (main line first, variations in PGN order)', () => {
    expect(extractLines(o).map((l) => l.moves.join(' '))).toEqual(['d4 d5 c4 e6 Nc3', 'd4 d5 c4 c6 Nf3', 'd4 d5 c4 dxc4']);
    expect(extractLines(o).map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it('labels a line with the last comment on its path, else none (the opening name is shown)', () => {
    expect(extractLines(o).map((l) => l.label)).toEqual(['QGD', 'Slav', 'QGD']);
    expect(extractLines(opening('1. e4 e5 *', 'white'))[0].label).toBeUndefined();
  });

  it('builds stable ids from the colour and the SAN sequence, whatever the opening (AC-45)', () => {
    expect(extractLines(o)[0].id).toBe(lineId('white', ['d4', 'd5', 'c4', 'e6', 'Nc3']));
    expect(extractLines({ ...o, id: 'other' })[0].id).toBe(extractLines(o)[0].id);
    expect(extractLines(o)[0].id).toBe('white|d4 d5 c4 e6 Nc3');
  });

  it('ignores lines without a move of the player', () => {
    // With Black, a line that stops after White's first move has nothing to play.
    const black = opening('1. e4 (1. d4 d5) 1... c5 *', 'black');
    expect(extractLines(black).map((l) => l.moves.join(' '))).toEqual(['e4 c5', 'd4 d5']);
    expect(extractLines(opening('1. e4 *', 'black'))).toEqual([]);
  });
});

describe('movesAfter', () => {
  it('lists the repertoire moves from a position', () => {
    const o = opening('1. d4 d5 2. c4 e6 (2... c6) (2... dxc4) *', 'black');
    expect(movesAfter(o.tree, [])).toEqual(['d4']);
    expect(movesAfter(o.tree, ['d4', 'd5', 'c4'])).toEqual(['e6', 'c6', 'dxc4']);
    expect(movesAfter(o.tree, ['e4'])).toEqual([]);
  });
});

