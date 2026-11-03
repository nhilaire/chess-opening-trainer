// Session queue and results. Rules: docs/PRD.md "Session queue" and "Spaced repetition".
import { extractLines, Line } from './repertoire';
import { DailyNew, isDue, newLinesLeft, Progress } from './scheduler';
import type { Opening } from './types';

export const FALLBACK_LINES = 10;

export type Mode = 'discover' | 'review';

export interface QueueItem {
  line: Line;
  mode: Mode;
}

export type Outcome = 'learnt' | 'success' | 'failure';

export interface Session {
  queue: QueueItem[];
  index: number; // current item
  requeued: string[]; // line ids already put back once
  results: Record<string, 'learnt' | 'ok' | 'failed'>; // one entry per line, "failed" sticks
}

type Ranked = { line: Line; openingRank: number };

function rankedLines(openings: readonly Opening[]): Ranked[] {
  return openings.flatMap((opening, openingRank) => extractLines(opening).map((line) => ({ line, openingRank })));
}

// Home list order, then tree order.
const byListOrder = (a: Ranked, b: Ranked) => a.openingRank - b.openingRank || a.line.order - b.line.order;

export interface QueueInput {
  openings: readonly Opening[]; // in home list order
  progress: Progress;
  daily: DailyNew | undefined;
  today: string;
  openingId?: string; // « S'entraîner sur cette ouverture »
}

export function buildQueue({ openings, progress, daily, today, openingId }: QueueInput): QueueItem[] {
  const all = rankedLines(openings).filter((r) => !openingId || r.line.openingId === openingId);
  const byDue = (a: Ranked, b: Ranked) => progress[a.line.id].due.localeCompare(progress[b.line.id].due) || byListOrder(a, b);
  const due = all.filter((r) => isDue(progress[r.line.id], today)).sort(byDue);
  const fresh = all.filter((r) => !progress[r.line.id]).sort(byListOrder).slice(0, newLinesLeft(daily, today));
  const queue: QueueItem[] = [
    ...due.map((r) => ({ line: r.line, mode: 'review' as const })),
    ...fresh.map((r) => ({ line: r.line, mode: 'discover' as const })),
  ];
  if (queue.length || !openingId) return queue;
  // One opening with nothing to do today: train its 10 learnt lines with the earliest due date anyway.
  return all
    .filter((r) => progress[r.line.id])
    .sort(byDue)
    .slice(0, FALLBACK_LINES)
    .map((r) => ({ line: r.line, mode: 'review' as const }));
}

export function startSession(queue: QueueItem[]): Session {
  return { queue, index: 0, requeued: [], results: {} };
}

export function currentItem(session: Session): QueueItem | undefined {
  return session.queue[session.index];
}

// Records the outcome of the current line and moves on. A failed line is put back at the end once per session.
export function finishLine(session: Session, outcome: Outcome): Session {
  const item = currentItem(session);
  if (!item) return session;
  const id = item.line.id;
  const previous = session.results[id];
  const result = outcome === 'failure' || previous === 'failed' ? 'failed' : outcome === 'learnt' ? 'learnt' : 'ok';
  const requeue = outcome === 'failure' && !session.requeued.includes(id);
  return {
    queue: requeue ? [...session.queue, { line: item.line, mode: 'review' }] : session.queue,
    index: session.index + 1,
    requeued: requeue ? [...session.requeued, id] : session.requeued,
    results: { ...session.results, [id]: result },
  };
}

export function isOver(session: Session): boolean {
  return session.index >= session.queue.length;
}

export function summary(session: Session): { ok: number; failed: number; learnt: number } {
  const values = Object.values(session.results);
  return {
    ok: values.filter((v) => v === 'ok').length,
    failed: values.filter((v) => v === 'failed').length,
    learnt: values.filter((v) => v === 'learnt').length,
  };
}
