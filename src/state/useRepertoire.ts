// App state: openings, line progress and feedback settings, loaded once and saved on
// every change. The clock is read here (today's local day), never in src/game/.
import { useCallback, useEffect, useState } from 'react';

import { addOpening, deleteOpening, renameOpening } from '../game/library';
import { learn, localDay, Progress, review } from '../game/scheduler';
import type { Outcome, QueueItem } from '../game/session';
import type { Opening } from '../game/types';
import { DEFAULT_FEEDBACK, Feedback, loadState, saveFeedback, saveOpenings, saveProgress } from '../storage/repertoireStore';

export function today(): string {
  return localDay(new Date());
}

export interface Repertoire {
  ready: boolean;
  openings: Opening[];
  progress: Progress;
  feedback: Feedback;
  add: (opening: Opening) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  recordLine: (item: QueueItem, outcome: Outcome) => void;
  setFeedback: (feedback: Feedback) => void;
}

export function useRepertoire(): Repertoire {
  const [ready, setReady] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [feedback, setFeedbackState] = useState<Feedback>(DEFAULT_FEEDBACK);

  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await loadState();
      if (!alive) return;
      setOpenings(state.openings);
      setProgress(state.progress);
      setFeedbackState(state.feedback);
      setReady(true);
      void saveOpenings(state.openings); // first launch: the embedded openings become the saved list
    })();
    return () => {
      alive = false;
    };
  }, []);

  const add = useCallback((opening: Opening) => {
    setOpenings((current) => {
      const next = addOpening(current, opening);
      void saveOpenings(next);
      return next;
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setOpenings((current) => {
      const next = renameOpening(current, id, name);
      void saveOpenings(next);
      return next;
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      const next = deleteOpening(openings, progress, id);
      setOpenings(next.openings);
      setProgress(next.progress);
      void saveOpenings(next.openings);
      void saveProgress(next.progress);
    },
    [openings, progress],
  );

  const recordLine = useCallback((item: QueueItem, outcome: Outcome) => {
    const day = today();
    setProgress((current) => {
      const state = current[item.line.id];
      const updated = outcome === 'learnt' || !state ? learn(day) : review(state, outcome === 'success', day);
      const next = { ...current, [item.line.id]: updated };
      void saveProgress(next);
      return next;
    });
  }, []);

  const setFeedback = useCallback((value: Feedback) => {
    setFeedbackState(value);
    void saveFeedback(value);
  }, []);

  return { ready, openings, progress, feedback, add, rename, remove, recordLine, setFeedback };
}
