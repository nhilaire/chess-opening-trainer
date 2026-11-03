import type { Line } from '../game/repertoire';
import {
  addDays,
  countLines,
  isDue,
  learn,
  localDay,
  Progress,
  review,
} from '../game/scheduler';

const TODAY = '2026-11-03';
const line = (id: string): Line => ({ id, openingId: 'o', moves: ['e4'], order: 0 });

describe('dates', () => {
  it('adds calendar days across months and years', () => {
    expect(addDays('2026-11-03', 1)).toBe('2026-11-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-02-28', 30)).toBe('2026-03-30');
  });

  it('reads the local calendar day of a date', () => {
    expect(localDay(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
    expect(localDay(new Date(2026, 0, 9, 0, 1))).toBe('2026-01-09');
  });
});

describe('Leitner boxes (AC-15, AC-16)', () => {
  it('a finished discovery puts the line in box 1, due tomorrow', () => {
    expect(learn(TODAY)).toEqual({ box: 1, due: '2026-11-04', learnt: TODAY });
  });

  it.each([
    [1, 2, 3],
    [2, 3, 7],
    [3, 4, 14],
    [4, 5, 30],
    [5, 6, 60],
    [6, 6, 60],
  ])('a success from box %i goes to box %i, due in %i days', (from, to, days) => {
    const next = review({ box: from, due: TODAY, learnt: '2026-01-01' }, true, TODAY);
    expect(next.box).toBe(to);
    expect(next.due).toBe(addDays(TODAY, days));
  });

  it('a failure goes back to box 1, due today', () => {
    expect(review({ box: 5, due: TODAY, learnt: '2026-01-01' }, false, TODAY)).toEqual({
      box: 1,
      due: TODAY,
      learnt: '2026-01-01',
      lastFailed: TODAY,
    });
  });

  it('a success after a failure the same day stays in box 1, due tomorrow', () => {
    const failed = review({ box: 3, due: TODAY, learnt: '2026-01-01' }, false, TODAY);
    const passed = review(failed, true, TODAY);
    expect(passed.box).toBe(1);
    expect(passed.due).toBe('2026-11-04');
    // The next day, a success climbs normally again.
    expect(review(passed, true, '2026-11-04').box).toBe(2);
  });

  it('a line is due when its date is today or earlier', () => {
    expect(isDue({ box: 1, due: TODAY, learnt: TODAY }, TODAY)).toBe(true);
    expect(isDue({ box: 1, due: '2026-10-01', learnt: TODAY }, TODAY)).toBe(true);
    expect(isDue({ box: 1, due: '2026-11-04', learnt: TODAY }, TODAY)).toBe(false);
    expect(isDue(undefined, TODAY)).toBe(false);
  });
});

describe('training ahead of time (AC-18)', () => {
  it('a line not due yet keeps its box and due date when succeeded', () => {
    const state = { box: 3, due: '2026-11-08', learnt: '2026-10-01' };
    expect(review(state, true, TODAY)).toEqual(state);
  });

  it('a line not due yet goes back to box 1, due today, when failed', () => {
    expect(review({ box: 3, due: '2026-11-08', learnt: '2026-10-01' }, false, TODAY)).toEqual({
      box: 1,
      due: TODAY,
      learnt: '2026-10-01',
      lastFailed: TODAY,
    });
  });
});

describe('counts (AC-19)', () => {
  const lines = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(line);
  const progress: Progress = {
    a: { box: 4, due: '2026-11-20', learnt: '2026-09-01' }, // mastered, not due
    b: { box: 6, due: '2026-10-30', learnt: '2026-08-01' }, // mastered and overdue
    c: { box: 1, due: TODAY, learnt: '2026-11-02' }, // due
    d: { box: 2, due: '2026-11-05', learnt: '2026-11-01' }, // learnt, not due
  };

  it('mastered = box >= 4, to review = due date <= today, new = never learnt', () => {
    expect(countLines(lines, progress, TODAY)).toEqual({ mastered: 2, due: 2, fresh: 4, total: 8 });
  });

});
