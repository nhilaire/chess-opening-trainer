import { parseDetail, parseList } from '../game/api';
import { extractLines } from '../game/repertoire';

// A small fake repertoire in the API shape (not the user's data).
const detail = (over: Record<string, unknown> = {}) => ({
  id: 'test-italienne',
  name: 'Italienne test',
  playerColor: 'white',
  description: 'ignored',
  variants: [{ id: 'x', name: 'ignored' }],
  lineCount: 2,
  tree: [
    {
      move: 'e4',
      children: [
        {
          move: 'e5',
          children: [
            { move: 'Nf3', name: 'Ouverture du cavalier', children: [{ move: 'Nc6', children: [{ move: 'Bc4', name: 'Italienne' }] }] },
            { move: 'f4', name: 'Gambit du roi' },
          ],
        },
      ],
    },
  ],
  ...over,
});

describe('API list (AC-41)', () => {
  it('reads the ids of a top-level array', () => {
    expect(parseList([{ id: 'a', name: 'A', lineCount: 3 }, { id: 'b' }])).toEqual(['a', 'b']);
    expect(parseList([])).toEqual([]);
  });

  it('rejects any other shape', () => {
    expect(parseList({ items: [] })).toBeNull();
    expect(parseList([{ name: 'no id' }])).toBeNull();
    expect(parseList('x')).toBeNull();
  });
});

describe('API detail (AC-06, AC-37, AC-41)', () => {
  it('builds the opening: colour, name as written, lines start→leaf labelled with the last name', () => {
    const opening = parseDetail(detail())!;
    expect(opening).toMatchObject({ id: 'test-italienne', name: 'Italienne test', color: 'white', origin: 'api' });
    expect(extractLines(opening).map((l) => [l.id, l.label])).toEqual([
      ['white|e4 e5 Nf3 Nc6 Bc4', 'Italienne'],
      ['white|e4 e5 f4', 'Gambit du roi'],
    ]);
  });

  it('merges sibling nodes with the same move and normalises SAN', () => {
    const opening = parseDetail(
      detail({ tree: [{ move: 'e4', children: [{ move: 'e5', children: [{ move: 'Nf3' }] }] }, { move: 'e4', name: 'Bis', children: [{ move: 'c5', children: [{ move: 'Nf3' }] }] }] }),
    )!;
    expect(opening.tree).toHaveLength(1);
    expect(opening.tree[0].comment).toBe('Bis');
    expect(extractLines(opening).map((l) => l.moves.join(' '))).toEqual(['e4 e5 Nf3', 'e4 c5 Nf3']);
    const castle = parseDetail(detail({ tree: [{ move: 'e4', children: [{ move: 'e5', children: [{ move: 'Nf3', children: [{ move: 'Nc6', children: [{ move: 'Bc4', children: [{ move: 'Bc5', children: [{ move: '0-0' }] }] }] }] }] }] }] }))!;
    expect(extractLines(castle)[0].moves.pop()).toBe('O-O');
  });

  it('rejects an illegal move, an unknown colour, a wrong shape or no player move', () => {
    expect(parseDetail(detail({ tree: [{ move: 'e5' }] }))).toBeNull();
    expect(parseDetail(detail({ playerColor: 'red' }))).toBeNull();
    expect(parseDetail(detail({ tree: { move: 'e4' } }))).toBeNull();
    expect(parseDetail(detail({ tree: [{ move: 4 }] }))).toBeNull();
    expect(parseDetail(detail({ playerColor: 'black', tree: [{ move: 'e4' }] }))).toBeNull();
    expect(parseDetail(null)).toBeNull();
  });
});
