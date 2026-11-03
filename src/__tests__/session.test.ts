import { parsePgn } from '../game/pgn';
import { extractLines } from '../game/repertoire';
import { Progress } from '../game/scheduler';
import { buildQueue, currentItem, finishLine, isOver, startSession, summary } from '../game/session';
import type { Color, Opening } from '../game/types';

const TODAY = '2026-11-03';

function opening(id: string, pgn: string, color: Color = 'white'): Opening {
  const parsed = parsePgn(pgn);
  if (!parsed.ok) throw new Error('bad test PGN');
  return { id, name: id, color, origin: 'imported', tree: parsed.tree };
}

// A: 3 lines, B: 2 lines, C: 12 lines.
const A = opening('A', '1. e4 e5 (1... c5 2. Nf3) (1... e6 2. d4) 2. Nf3 *');
const B = opening('B', '1. d4 d5 (1... Nf6 2. c4) 2. c4 *');
const C = opening('C', Array.from({ length: 12 }, (_, i) => `1. ${['a3', 'a4', 'b3', 'b4', 'c3', 'c4', 'd3', 'd4', 'e3', 'e4', 'f3', 'f4'][i]} *`).join(' '));
const ids = (o: Opening) => extractLines(o).map((l) => l.id);
const [a1, a2, a3] = ids(A);
const [b1, b2] = ids(B);

const learnt = (due: string, box = 1) => ({ box, due, learnt: '2026-10-01' });

describe('« Réviser » queue (AC-17)', () => {
  it('puts every due line first (earliest due, ties by list order then tree order), then new lines', () => {
    const progress: Progress = {
      [a1]: learnt('2026-11-02'),
      [b1]: learnt('2026-11-01'),
      [a2]: learnt('2026-11-02'),
      [b2]: learnt('2026-11-09'), // not due
    };
    const queue = buildQueue({ openings: [A, B], progress, daily: undefined, today: TODAY });
    expect(queue.map((q) => [q.line.id, q.mode])).toEqual([
      [b1, 'review'],
      [a1, 'review'],
      [a2, 'review'],
      [a3, 'discover'],
    ]);
  });

  it('offers new lines in list order then tree order, up to the daily limit left', () => {
    const queue = buildQueue({ openings: [A, B, C], progress: {}, daily: { day: TODAY, count: 1 }, today: TODAY });
    expect(queue.map((q) => q.line.id)).toEqual([a1, a2, a3, b1]);
    expect(queue.every((q) => q.mode === 'discover')).toBe(true);
    expect(buildQueue({ openings: [A], progress: {}, daily: { day: TODAY, count: 5 }, today: TODAY })).toEqual([]);
  });
});

describe('single opening (AC-18)', () => {
  it('restricts the queue to that opening', () => {
    const queue = buildQueue({ openings: [A, B], progress: {}, daily: undefined, today: TODAY, openingId: 'B' });
    expect(queue.map((q) => q.line.id)).toEqual([b1, b2]);
  });

  it('with nothing due and no new line available, trains the 10 learnt lines due earliest', () => {
    const cIds = ids(C);
    const progress: Progress = Object.fromEntries(cIds.map((id, i) => [id, learnt(`2026-12-${String(30 - i).padStart(2, '0')}`)]));
    const queue = buildQueue({ openings: [C], progress, daily: undefined, today: TODAY, openingId: 'C' });
    expect(queue).toHaveLength(10);
    expect(queue[0].line.id).toBe(cIds[11]); // due 2026-12-19, the earliest
    expect(queue.every((q) => q.mode === 'review')).toBe(true);
  });

  it('with no learnt line and the daily limit used up, has nothing to train', () => {
    expect(buildQueue({ openings: [A], progress: {}, daily: { day: TODAY, count: 5 }, today: TODAY, openingId: 'A' })).toEqual([]);
  });
});

describe('session (AC-17, AC-15 summary)', () => {
  const queue = buildQueue({ openings: [A], progress: { [a1]: learnt(TODAY), [a2]: learnt(TODAY) }, daily: undefined, today: TODAY });

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

  it('keeps a line failed then passed in the session as « à revoir »', () => {
    let s = startSession(queue.slice(0, 1));
    s = finishLine(s, 'failure');
    s = finishLine(s, 'success');
    expect(isOver(s)).toBe(true);
    expect(summary(s)).toEqual({ ok: 0, failed: 1, learnt: 0 });
  });
});
