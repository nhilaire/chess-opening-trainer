import { parsePgn } from '../game/pgn';
import { extractLines } from '../game/repertoire';
import { Progress } from '../game/scheduler';
import { buildQueue, currentItem, finishedIds, finishLine, isOver, startSession, summary } from '../game/session';
import { createEmbeddedOpenings } from '../game/embedded';
import type { Color, Opening } from '../game/types';

function opening(id: string, pgn: string, color: Color = 'white'): Opening {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return { id, name: id, color, origin: 'api', tree: parsed.tree };
}

// A: 3 lines, B: 2 lines, C: 12 lines.
const A = opening('A', '1. e4 e5 (1... c5 2. Nf3) (1... e6 2. d4) 2. Nf3 *');
const B = opening('B', '1. d4 d5 (1... Nf6 2. c4) 2. c4 *');
const C = opening('C', Array.from({ length: 12 }, (_, i) => `1. ${['a3', 'a4', 'b3', 'b4', 'c3', 'c4', 'd3', 'd4', 'e3', 'e4', 'f3', 'f4'][i]} *`).join(' '));
const ids = (o: Opening) => extractLines(o).map((l) => l.id);
const [a1, a2, a3] = ids(A);
const [b1, b2] = ids(B);

const learnt = (due: string, box = 1) => ({ box, due, learnt: '2026-10-01' });

// Deterministic random sources in [0, 1).
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('« Réviser » queue (AC-16, AC-17)', () => {
  const progress: Progress = {
    [a1]: learnt('2026-11-02'), // due
    [b1]: learnt('2026-11-09'), // not due yet
    [b2]: learnt('2026-12-01', 5), // not due yet
  };

  it('holds every line exactly once: new ones in discovery, learnt ones (due or not) in review', () => {
    const queue = buildQueue({ openings: [A, B, C], progress, random: seeded(1) });
    expect(queue.map((q) => q.line.id).sort()).toEqual([...ids(A), ...ids(B), ...ids(C)].sort());
    const mode = Object.fromEntries(queue.map((q) => [q.line.id, q.mode]));
    expect([mode[a1], mode[b1], mode[b2], mode[a2], mode[a3]]).toEqual(['review', 'review', 'review', 'discover', 'discover']);
  });

  it('follows the random source: two sources give two orders, the same source the same order', () => {
    const order = (seed: number) => buildQueue({ openings: [A, B, C], progress, random: seeded(seed) }).map((q) => q.line.id);
    expect(order(1)).toEqual(order(1));
    expect(order(1)).not.toEqual(order(2));
    expect(order(1)).not.toEqual(extractLines(A).concat(extractLines(B), extractLines(C)).map((l) => l.id));
  });

  it('has no daily limit: a first launch queues every line of the 3 embedded openings', () => {
    const embedded = createEmbeddedOpenings();
    const total = embedded.reduce((n, o) => n + extractLines(o).length, 0);
    const queue = buildQueue({ openings: embedded, progress: {}, random: seeded(3) });
    expect(queue).toHaveLength(total);
    expect(total).toBeGreaterThan(30);
    expect(queue.every((q) => q.mode === 'discover')).toBe(true);
  });

  it('is empty only when there is no line', () => {
    expect(buildQueue({ openings: [], progress: {}, random: seeded(1) })).toEqual([]);
  });
});

describe('single opening (AC-18)', () => {
  it('queues all lines of that opening, and only them, even when none is due', () => {
    const progress: Progress = Object.fromEntries(ids(C).map((id) => [id, learnt('2026-12-30', 3)]));
    const queue = buildQueue({ openings: [A, B, C], progress, openingId: 'C', random: seeded(5) });
    expect(queue.map((q) => q.line.id).sort()).toEqual(ids(C).sort());
    expect(queue.every((q) => q.mode === 'review')).toBe(true);
    expect(buildQueue({ openings: [A, B], progress: {}, openingId: 'B', random: seeded(5) }).map((q) => q.line.id).sort()).toEqual([b1, b2].sort());
  });
});

describe('session (AC-17, AC-15 summary)', () => {
  const queue = [a1, a2, a3].map((id, i) => ({ line: extractLines(A)[i], mode: id === a3 ? ('discover' as const) : ('review' as const) }));

  it('re-queues a failed line once at the end, and counts each line once in the summary', () => {
    let s = startSession(queue); // a1 review, a2 review, a3 discover
    s = finishLine(s, 'failure'); // a1
    s = finishLine(s, 'success'); // a2
    s = finishLine(s, 'learnt'); // a3
    expect(currentItem(s)?.line.id).toBe(a1);
    expect(currentItem(s)?.mode).toBe('review');
    s = finishLine(s, 'failure'); // a1 again: not re-queued a second time
    expect(isOver(s)).toBe(true);
    expect(summary(s)).toEqual({ ok: 1, failed: 1, learnt: 1 });
  });

  it('records the line reached, removes it from the rest of the queue and re-queues it when failed (AC-46)', () => {
    const [l1, l2, l3] = extractLines(A);
    let s = startSession([l1, l2, l3].map((line) => ({ line, mode: 'review' as const })));
    s = finishLine(s, 'success', l3); // target l1, the player went to l3
    expect(summary(s)).toEqual({ ok: 1, failed: 0, learnt: 0 });
    expect(s.queue.map((q) => q.line.id)).toEqual([l1.id, l2.id]); // l3 no longer waiting
    expect(finishedIds(s)).toEqual([l3.id]);
    s = finishLine(s, 'failure', l1); // target l2, reached l1
    expect(s.queue.map((q) => q.line.id)).toEqual([l1.id, l2.id, l1.id]);
    expect(isOver(s)).toBe(false);
    s = finishLine(s, 'learnt'); // the re-queued l1
    expect(isOver(s)).toBe(true);
    expect(summary(s)).toEqual({ ok: 1, failed: 1, learnt: 0 });
  });

  it('keeps a line failed then passed in the session as « à revoir »', () => {
    let s = startSession(queue.slice(0, 1));
    s = finishLine(s, 'failure');
    s = finishLine(s, 'success');
    expect(isOver(s)).toBe(true);
    expect(summary(s)).toEqual({ ok: 0, failed: 1, learnt: 0 });
  });
});
