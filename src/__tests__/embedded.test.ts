import fs from 'fs';
import path from 'path';

import { createEmbeddedOpenings, displayName } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import type { MoveTree } from '../game/types';

// Leaf paths of the earlier web app's indented format, read independently of the conversion script.
function pwaLines(text: string): { moves: string[]; labels: string[] }[] {
  const rows = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => ({ indent: l.search(/\S/), content: l.trim() }));
  const stack: { indent: number; moves: string[]; labels: string[] }[] = [];
  const out: { moves: string[]; labels: string[] }[] = [];
  rows.forEach((row, i) => {
    while (stack.length && stack[stack.length - 1].indent >= row.indent) stack.pop();
    const base = stack[stack.length - 1] ?? { moves: [], labels: [] };
    const labels = [...base.labels, ...[...row.content.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1])];
    const moves = [...base.moves, ...row.content.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean)];
    stack.push({ indent: row.indent, moves, labels });
    const next = rows[i + 1];
    if (!next || next.indent <= row.indent) out.push({ moves, labels });
  });
  return out;
}

const strip = (san: string) => san.replace(/[+#]/g, '');
const fixture = (file: string) => fs.readFileSync(path.join(__dirname, 'fixtures', 'pwa', file), 'utf8');

describe('embedded openings (AC-05)', () => {
  const openings = createEmbeddedOpenings();
  const sources = { d4: 'd4-openings.txt', scandinavian: 'scandinavian.txt', d4Black: 'slav-black.txt' } as const;

  it('are the 3 repertoires of the web app with their colours', () => {
    expect(openings.map((o) => [o.embeddedKey, o.color, o.origin])).toEqual([
      ['d4', 'white', 'embedded'],
      ['scandinavian', 'black', 'embedded'],
      ['d4Black', 'black', 'embedded'],
    ]);
  });

  it.each(Object.entries(sources))('%s: every move is legal and the lines are exactly the source leaves', (key, file) => {
    const opening = openings.find((o) => o.embeddedKey === key)!;
    const expected = pwaLines(fixture(file)).map((l) => l.moves.map(strip).join(' '));
    const actual = extractLines(opening).map((l) => l.moves.map(strip).join(' '));
    expect(actual.sort()).toEqual(expected.sort());
  });

  it('holds the Scandinavian 7. h3 line added in v0.2.0', () => {
    const scandinavian = openings.find((o) => o.embeddedKey === 'scandinavian')!;
    expect(extractLines(scandinavian).map((l) => l.moves.join(' '))).toContain(
      'e4 d5 exd5 Qxd5 Nc3 Qa5 Bc4 Nf6 d3 c6 Bd2 Qc7 h3 Nbd7 Nf3 b5 Bb3 Nc5 Qe2 e6 d4 Nxb3 axb3 Bb7 O-O Be7',
    );
  });

  it('restores accents in the French labels and keeps the English ones', () => {
    const comments = (nodes: MoveTree): string[] => nodes.flatMap((n) => [...(n.comment ? [n.comment] : []), ...comments(n.children)]);
    const labels = new Set(openings.flatMap((o) => comments(o.tree)));
    expect(labels).toContain('Gambit Dame Refusé');
    expect(labels).toContain('Défense Slave');
    expect(labels).toContain('Système de Londres');
    expect(labels).toContain('Harwitz Attack');
    expect([...labels].filter((l) => l && /Defense Slave|Refuse\b|Systeme/.test(l))).toEqual([]);
  });
});

describe('opening names (AC-37)', () => {
  const names = { d4: 'Ouvertures en d4', scandinavian: 'Défense Scandinave', d4Black: 'd4 avec les Noirs' };

  it('follow the UI language for an embedded opening never renamed', () => {
    expect(displayName({ name: '', embeddedKey: 'd4' }, names)).toBe('Ouvertures en d4');
    expect(displayName({ name: '', embeddedKey: 'd4' }, { ...names, d4: 'd4 openings' })).toBe('d4 openings');
  });

  it('keep the given name once renamed, in every language', () => {
    expect(displayName({ name: 'Mon d4', embeddedKey: 'd4' }, names)).toBe('Mon d4');
    expect(displayName({ name: 'Import' }, names)).toBe('Import');
  });
});
