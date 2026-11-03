// Placeholder game ("tap as fast as you can"), replaced by the real game during build-game.
// Rule of the factory: game logic is pure TypeScript (no React, no timers inside), driven by actions with `now`.

export const ROUND_SECONDS = 10;

export type GameStatus = 'ready' | 'playing' | 'over';

export interface GameState {
  status: GameStatus;
  score: number;
  level: number;
  startedAt: number | null;
  endedAt: number | null;
}

export type GameAction =
  | { type: 'start'; now: number }
  | { type: 'tap'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'reset' };

export const initialState: GameState = { status: 'ready', score: 0, level: 1, startedAt: null, endedAt: null };

function deadline(state: GameState): number {
  return (state.startedAt ?? 0) + ROUND_SECONDS * 1000;
}

function finish(state: GameState): GameState {
  return { ...state, status: 'over', endedAt: deadline(state) };
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { ...initialState, status: 'playing', startedAt: action.now };
    case 'tap':
      if (state.status !== 'playing') return state;
      if (action.now >= deadline(state)) return finish(state);
      return { ...state, score: state.score + 1 };
    case 'tick':
      return state.status === 'playing' && action.now >= deadline(state) ? finish(state) : state;
    case 'reset':
      return initialState;
  }
}

export function remainingSeconds(state: GameState, now: number): number {
  if (state.status !== 'playing') return state.status === 'over' ? 0 : ROUND_SECONDS;
  return Math.max(0, Math.ceil((deadline(state) - now) / 1000));
}

export function durationSeconds(state: GameState): number {
  if (state.startedAt === null || state.endedAt === null) return 0;
  return Math.round((state.endedAt - state.startedAt) / 1000);
}
