// Spaced repetition per line (Leitner boxes). Dates are local calendar days "YYYY-MM-DD", always passed in
// (`today`), never read here. Rules: docs/PRD.md "Spaced repetition".
import type { Line } from './repertoire';

export const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60]; // box 1..6
export const MAX_BOX = INTERVAL_DAYS.length;
export const MASTERED_BOX = 4;
export const NEW_LINES_PER_DAY = 5;

export interface LineState {
  box: number; // 1..6
  due: string; // day the line is due again
  learnt: string; // day the discovery was finished
  lastFailed?: string; // last day the line was failed
}

export type Progress = Record<string, LineState>; // by line id

export interface DailyNew {
  day: string;
  count: number; // new lines learnt that day, across the whole app
}

// Local calendar day of a Date ("YYYY-MM-DD").
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function intervalFor(box: number): number {
  return INTERVAL_DAYS[Math.min(Math.max(box, 1), MAX_BOX) - 1];
}

// Discovery finished: box 1, due tomorrow (learnt, not a success).
export function learn(today: string): LineState {
  return { box: 1, due: addDays(today, 1), learnt: today };
}

// Review result of a learnt line.
export function review(state: LineState, success: boolean, today: string): LineState {
  if (!success) return { ...state, box: 1, due: today, lastFailed: today };
  // Failed earlier today, then succeeded: never better than a plain success from box 1.
  if (state.lastFailed === today) return { ...state, box: 1, due: addDays(today, 1) };
  const box = Math.min(state.box + 1, MAX_BOX);
  return { ...state, box, due: addDays(today, intervalFor(box)) };
}

export function isDue(state: LineState | undefined, today: string): boolean {
  return state !== undefined && state.due <= today;
}

export function newLinesLeft(daily: DailyNew | undefined, today: string): number {
  const used = daily && daily.day === today ? daily.count : 0;
  return Math.max(0, NEW_LINES_PER_DAY - used);
}

export function countNewLearnt(daily: DailyNew | undefined, today: string): DailyNew {
  return { day: today, count: (daily && daily.day === today ? daily.count : 0) + 1 };
}

export interface Counts {
  mastered: number;
  due: number; // learnt and due date <= today
  fresh: number; // never learnt
  total: number;
}

export function countLines(lines: readonly Line[], progress: Progress, today: string): Counts {
  let mastered = 0;
  let due = 0;
  let fresh = 0;
  for (const line of lines) {
    const state = progress[line.id];
    if (!state) fresh++;
    else {
      if (state.box >= MASTERED_BOX) mastered++;
      if (isDue(state, today)) due++;
    }
  }
  return { mastered, due, fresh, total: lines.length };
}

// Number on the « Réviser » button: due lines plus the new lines still allowed today.
export function reviewCount(lines: readonly Line[], progress: Progress, daily: DailyNew | undefined, today: string): number {
  const { due, fresh } = countLines(lines, progress, today);
  return due + Math.min(fresh, newLinesLeft(daily, today));
}
