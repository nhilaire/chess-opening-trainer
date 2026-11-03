import { ROUND_SECONDS, durationSeconds, initialState, reduce, remainingSeconds } from '../game/engine';

const T0 = 1_000_000;

describe('game engine', () => {
  it('starts a round with a zero score', () => {
    const s = reduce(initialState, { type: 'start', now: T0 });
    expect(s).toMatchObject({ status: 'playing', score: 0, startedAt: T0 });
    expect(remainingSeconds(s, T0)).toBe(ROUND_SECONDS);
  });

  it('counts taps while the round is running', () => {
    let s = reduce(initialState, { type: 'start', now: T0 });
    s = reduce(s, { type: 'tap', now: T0 + 100 });
    s = reduce(s, { type: 'tap', now: T0 + 200 });
    expect(s.score).toBe(2);
  });

  it('ends the round at the deadline and ignores late taps', () => {
    let s = reduce(initialState, { type: 'start', now: T0 });
    s = reduce(s, { type: 'tap', now: T0 + 100 });
    s = reduce(s, { type: 'tick', now: T0 + ROUND_SECONDS * 1000 });
    expect(s.status).toBe('over');
    expect(durationSeconds(s)).toBe(ROUND_SECONDS);
    expect(reduce(s, { type: 'tap', now: T0 + ROUND_SECONDS * 1000 + 1 }).score).toBe(1);
  });

  it('ignores taps before the round starts', () => {
    expect(reduce(initialState, { type: 'tap', now: T0 })).toBe(initialState);
  });
});
