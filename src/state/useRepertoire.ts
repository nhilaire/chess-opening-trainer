// App state: openings, line progress and feedback settings, loaded once and saved on every change; the openings
// API refresh runs once in the background after loading. The clock is read here (today's local day), never in
// src/game/.
import { useCallback, useEffect, useState } from 'react';

import { appFetcher } from '../api/appFetcher';
import { refreshOpenings } from '../game/refresh';
import type { Line } from '../game/repertoire';
import { learn, LineState, localDay, Progress, review } from '../game/scheduler';
import type { Outcome } from '../game/session';
import type { Opening } from '../game/types';
import { DEFAULT_FEEDBACK, Feedback, loadState, saveFeedback, saveProgress, saveRefresh } from '../storage/repertoireStore';
import { logError } from '../util/log';

export function today(): string {
  return localDay(new Date());
}

// Home status line: the refresh is running, it failed, it skipped unreadable openings, or nothing to show.
export type RefreshStatus = { kind: 'idle' } | { kind: 'updating' } | { kind: 'offline' } | { kind: 'partial'; skipped: number };

export interface Repertoire {
  ready: boolean;
  openings: Opening[];
  progress: Progress;
  feedback: Feedback;
  refresh: RefreshStatus;
  recordLine: (line: Line, outcome: Outcome) => void; // the line finished (leaf reached)
  setFeedback: (feedback: Feedback) => void;
}

// A never-learnt line finished in review (the player took its branch) counts as learnt when succeeded, and as
// failed (box 1, due today) when failed.
export function nextState(state: LineState | undefined, outcome: Outcome, day: string): LineState {
  if (outcome === 'learnt' || (!state && outcome === 'success')) return learn(day);
  if (!state) return { box: 1, due: day, learnt: day, lastFailed: day };
  return review(state, outcome === 'success', day);
}

export function useRepertoire(): Repertoire {
  const [ready, setReady] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [feedback, setFeedbackState] = useState<Feedback>(DEFAULT_FEEDBACK);
  const [refresh, setRefresh] = useState<RefreshStatus>({ kind: 'idle' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await loadState();
      if (!alive) return;
      setOpenings(state.openings);
      setProgress(state.progress);
      setFeedbackState(state.feedback);
      setReady(true);
      // The home screen is usable at once with the stored openings; the API answer replaces them when it comes.
      setRefresh({ kind: 'updating' });
      const result = await refreshOpenings(appFetcher, state.openings, state.api);
      if (!alive) return;
      if (result.kind === 'failed') {
        setRefresh({ kind: 'offline' });
        return;
      }
      try {
        await saveRefresh(result.openings, result.cache);
      } catch (error) {
        logError(error, 'save_refresh');
      }
      if (!alive) return;
      setOpenings(result.openings);
      setRefresh(result.skipped > 0 ? { kind: 'partial', skipped: result.skipped } : { kind: 'idle' });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const recordLine = useCallback((line: Line, outcome: Outcome) => {
    const day = today();
    setProgress((current) => {
      const next = { ...current, [line.id]: nextState(current[line.id], outcome, day) };
      void saveProgress(next);
      return next;
    });
  }, []);

  const setFeedback = useCallback((value: Feedback) => {
    setFeedbackState(value);
    void saveFeedback(value);
  }, []);

  return { ready, openings, progress, feedback, refresh, recordLine, setFeedback };
}
