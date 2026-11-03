import { cleanComment, MAX_PGN_CHARS, parsePgn, prefillName, validateName } from '../game/pgn';
import type { MoveTree } from '../game/types';

// Compact view of a tree: "san{comment}" with children in brackets.
function show(tree: MoveTree): string {
  return tree
    .map((n) => `${n.san}${n.comment ? `{${n.comment}}` : ''}${n.children.length ? `[${show(n.children)}]` : ''}`)
    .join(' ');
}

function treeOf(text: string): string {
  const result = parsePgn(text);
  if (!result.ok) throw new Error(`unexpected error ${JSON.stringify(result.error)}`);
  return show(result.tree);
}

describe('parsePgn (AC-07)', () => {
  it('reads tags, move numbers, nested variations, comments, NAGs, annotations, 0-0 and a result', () => {
    const pgn = [
      '[Event "Test"]',
      '[Site "?"]',
      '',
      '1. d4 d5 2. c4 { Gambit Dame } e6 $1 (2... c6!? { Défense Slave } 3. Nf3 (3. Nc3 Nf6) 3... Nf6) 3. Nc3 Nf6',
      '4. Bg5 Be7 5. e3 0-0 1-0',
    ].join('\n');
    expect(treeOf(pgn)).toBe(
      'd4[d5[c4{Gambit Dame}[e6[Nc3[Nf6[Bg5[Be7[e3[O-O]]]]]] c6{Défense Slave}[Nf3[Nf6] Nc3[Nf6]]]]]',
    );
  });

  it('removes Lichess commands from comments, drops empty comments and cuts long labels', () => {
    expect(cleanComment(' [%cal Gd2d4,Ge7e5] ')).toBeUndefined();
    expect(cleanComment('[%csl Gd4] Main line [%clk 0:05:00]')).toBe('Main line');
    const long = 'A'.repeat(50);
    expect(cleanComment(long)).toBe(`${'A'.repeat(39)}…`);
    expect(treeOf('1. e4 { [%cal Ge2e4] } e5 { Open game [%csl Ge5] } *')).toBe('e4[e5{Open game}]');
  });

  it('gives the same moves for 0-0 and O-O, and normalises check signs', () => {
    const a = treeOf('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. 0-0 *');
    const b = treeOf('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *');
    expect(a).toBe(b);
    expect(treeOf('1. e4 f5 2. Qh5 *')).toBe('e4[f5[Qh5+]]');
  });

  it('handles promotion SAN', () => {
    const pgn = '1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6 5. bxa8=Q *';
    expect(treeOf(pgn)).toContain('bxa8=Q');
  });

  it('attaches a comment placed before the first move of a variation to that move', () => {
    expect(treeOf('1. e4 e5 ({ Sicilian } 1... c5) *')).toBe('e4[e5 c5{Sicilian}]');
  });
});

describe('parsePgn: several games (AC-08)', () => {
  it('merges the games of a study into one tree with shared prefixes', () => {
    const pgn = [
      '[Event "Study: Chapter 1"]',
      '[ChapterName "Chapter 1"]',
      '',
      '1. d4 d5 2. c4 e6 *',
      '',
      '[Event "Study: Chapter 2"]',
      '',
      '1. d4 d5 2. c4 c6 *',
    ].join('\n');
    const result = parsePgn(pgn);
    expect(result.ok && show(result.tree)).toBe('d4[d5[c4[e6 c6]]]');
    expect(result.ok && result.tags.length).toBe(2);
  });

  it('starts again from the start position after a result even without tags', () => {
    expect(treeOf('1. e4 e5 1-0 1. d4 d5 0-1')).toBe('e4[e5] d4[d5]');
  });
});

describe('parsePgn: rejections (AC-09)', () => {
  it('rejects an empty text', () => {
    expect(parsePgn('   \n ')).toEqual({ ok: false, error: { kind: 'empty' } });
    expect(parsePgn('[Event "x"]\n')).toEqual({ ok: false, error: { kind: 'empty' } });
  });

  it('rejects a start position other than the standard one', () => {
    expect(parsePgn('[SetUp "1"]\n[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n\n1. Kb1 *')).toEqual({ ok: false, error: { kind: 'fen' } });
  });

  it('rejects an illegal move with its number and SAN', () => {
    expect(parsePgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bxf2 5. Nxf7 *')).toEqual({
      ok: false,
      error: { kind: 'illegal', move: '4...Bxf2' },
    });
    expect(parsePgn('1. e5 *')).toEqual({ ok: false, error: { kind: 'illegal', move: '1.e5' } });
  });

  it('rejects a text over 100 000 characters', () => {
    expect(parsePgn(`1. e4 ${' '.repeat(MAX_PGN_CHARS)}`)).toEqual({ ok: false, error: { kind: 'tooBig' } });
  });
});

describe('name rules (AC-10, AC-09, AC-13)', () => {
  it('prefills from ChapterName, else StudyName, else Event unless "?"', () => {
    expect(prefillName([{ Event: 'E', StudyName: 'S', ChapterName: 'C' }])).toBe('C');
    expect(prefillName([{ Event: 'E', StudyName: 'S' }])).toBe('S');
    expect(prefillName([{ Event: 'E' }])).toBe('E');
    expect(prefillName([{ Event: '?' }])).toBe('');
    expect(prefillName([])).toBe('');
  });

  it('accepts 1-40 characters after trimming', () => {
    expect(validateName('  Slave  ')).toBe('Slave');
    expect(validateName('   ')).toBeNull();
    expect(validateName('x'.repeat(40))).toBe('x'.repeat(40));
    expect(validateName('x'.repeat(41))).toBeNull();
  });
});
