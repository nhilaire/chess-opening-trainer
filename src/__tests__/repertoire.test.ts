import { Chess } from 'chess.js';

import { parsePgn } from '../game/pgn';
import { extractLines, importOpening, lineId, MAX_LINES, movesAfter, suggestedName } from '../game/repertoire';
import type { Color, Opening } from '../game/types';

function opening(pgn: string, color: Color, id = 'o1'): Opening {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return { id, name: 'Test', color, origin: 'imported', tree: parsed.tree };
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

  it('builds stable ids from the opening id and the SAN sequence', () => {
    expect(extractLines(o)[0].id).toBe(lineId('o1', ['d4', 'd5', 'c4', 'e6', 'Nc3']));
    expect(extractLines(o)[0].id).toBe('o1|d4 d5 c4 e6 Nc3');
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

describe('importOpening (AC-09, AC-11)', () => {
  it('creates an imported opening with its colour and trimmed name', () => {
    const result = importOpening('1. e4 d5 2. exd5 Qxd5 *', '  Scandi  ', 'black', 'imp-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.opening).toMatchObject({ id: 'imp-1', name: 'Scandi', color: 'black', origin: 'imported' });
      expect(extractLines(result.opening)).toHaveLength(1);
    }
  });

  it('rejects a PGN where no line has a move for the chosen colour', () => {
    expect(importOpening('1. e4 *', 'x', 'black', 'i')).toEqual({ ok: false, error: { kind: 'noPlayerMove' } });
  });

  it('rejects an empty or too long name', () => {
    expect(importOpening('1. e4 e5 *', ' ', 'white', 'i')).toEqual({ ok: false, error: { kind: 'name' } });
    expect(importOpening('1. e4 e5 *', 'x'.repeat(41), 'white', 'i')).toEqual({ ok: false, error: { kind: 'name' } });
  });

  it('rejects more than 1 000 repertoire lines (leaf paths)', () => {
    // 20 first moves x 20 replies x 3 legal second moves = 1 200 leaves, one game each.
    const games: string[] = [];
    const chess = new Chess();
    for (const first of chess.moves()) {
      chess.move(first);
      for (const reply of chess.moves()) {
        chess.move(reply);
        for (const second of chess.moves().slice(0, 3)) games.push(`1. ${first} ${reply} 2. ${second} *`);
        chess.undo();
      }
      chess.undo();
    }
    const pgn = games.join(' ');
    expect(games.length).toBeGreaterThan(MAX_LINES);
    expect(importOpening(pgn, 'Big', 'white', 'i')).toEqual({ ok: false, error: { kind: 'tooBig' } });
    expect(importOpening(games.slice(0, MAX_LINES).join(' '), 'Ok', 'white', 'i').ok).toBe(true);
  });

  it('suggests a name from the pasted tags', () => {
    expect(suggestedName('[StudyName "Mon étude"]\n\n1. e4 e5 *')).toBe('Mon étude');
    expect(suggestedName('not a pgn')).toBe('');
  });
});
