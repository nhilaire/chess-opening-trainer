// Session queue and results. Rules: docs/PRD.md "Session queue" and "Spaced repetition".
import { extractLines, Line } from './repertoire';
import type { Progress } from './scheduler';
import type { Opening } from './types';

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

export interface QueueInput {
  openings: readonly Opening[];
  progress: Progress;
  openingId?: string; // « S'entraîner sur cette ouverture »
  random?: () => number; // uniform in [0, 1), injected by tests
}

// Every line of the scope in a random order (Fisher-Yates); new lines are discovered, learnt ones reviewed.
export function buildQueue({ openings, progress, openingId, random = Math.random }: QueueInput): QueueItem[] {
  const queue: QueueItem[] = openings
    .filter((o) => !openingId || o.id === openingId)
    .flatMap((o) => extractLines(o))
    .map((line) => ({ line, mode: progress[line.id] ? 'review' : 'discover' }));
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function startSession(queue: QueueItem[]): Session {
  return { queue, index: 0, requeued: [], results: {} };
}

export function currentItem(session: Session): QueueItem | undefined {
  return session.queue[session.index];
}

// Records the outcome of the current item and moves on. `reached` is the line actually finished (the leaf reached
// in review, which may differ from the item's target): it is removed from the rest of the queue, and put back once
// at the end when failed.
export function finishLine(session: Session, outcome: Outcome, reached?: Line): Session {
  const item = currentItem(session);
  if (!item) return session;
  const line = reached ?? item.line;
  const id = line.id;
  const previous = session.results[id];
  const result = outcome === 'failure' || previous === 'failed' ? 'failed' : outcome === 'learnt' ? 'learnt' : 'ok';
  const requeue = outcome === 'failure' && !session.requeued.includes(id);
  const done = session.queue.slice(0, session.index + 1);
  const rest = session.queue.slice(session.index + 1).filter((q) => q.line.id !== id);
  return {
    queue: [...done, ...rest, ...(requeue ? [{ line, mode: 'review' as const }] : [])],
    index: session.index + 1,
    requeued: requeue ? [...session.requeued, id] : session.requeued,
    results: { ...session.results, [id]: result },
  };
}

// Lines finished so far in the session (the opponent prefers the others).
export function finishedIds(session: Session): string[] {
  return Object.keys(session.results);
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
