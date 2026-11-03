import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmbeddedOpenings } from '../game/embedded';
import type { DailyNew, LineState, Progress } from '../game/scheduler';
import type { MoveNode, Opening } from '../game/types';
import { logError } from '../util/log';

// Everything stays on the phone. Versioned keys; a missing openings key means a first launch (embedded openings
// installed); an empty list is kept (the player deleted everything).
export const KEYS = {
  openings: 'repertoire.openings.v1',
  progress: 'repertoire.progress.v1',
  daily: 'repertoire.dailyNew.v1',
  feedback: 'settings.feedback.v1',
} as const;

export interface Feedback {
  sound: boolean;
  vibration: boolean;
}

export interface StoredState {
  openings: Opening[];
  progress: Progress;
  daily?: DailyNew;
  feedback: Feedback;
}

export const DEFAULT_FEEDBACK: Feedback = { sound: true, vibration: true };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isNode(v: unknown): v is MoveNode {
  return isObject(v) && typeof v.san === 'string' && Array.isArray(v.children) && v.children.every(isNode);
}

function isOpening(v: unknown): v is Opening {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.color === 'white' || v.color === 'black') &&
    (v.origin === 'embedded' || v.origin === 'imported') &&
    Array.isArray(v.tree) &&
    v.tree.every(isNode)
  );
}

function isLineState(v: unknown): v is LineState {
  return isObject(v) && typeof v.box === 'number' && typeof v.due === 'string' && typeof v.learnt === 'string';
}

function parse(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return null; // corrupt
  }
}

// Pure decoding of the stored values: anything corrupt falls back (embedded openings, empty progress, defaults).
export function decodeState(raw: { openings: string | null; progress: string | null; daily: string | null; feedback: string | null }): StoredState {
  const openings = parse(raw.openings);
  const progress = parse(raw.progress);
  const daily = parse(raw.daily);
  const feedback = parse(raw.feedback);
  return {
    openings: Array.isArray(openings) && openings.every(isOpening) ? openings : createEmbeddedOpenings(),
    progress: isObject(progress) ? Object.fromEntries(Object.entries(progress).filter(([, s]) => isLineState(s))) as Progress : {},
    daily: isObject(daily) && typeof daily.day === 'string' && typeof daily.count === 'number' ? { day: daily.day, count: daily.count } : undefined,
    feedback: isObject(feedback)
      ? { sound: feedback.sound !== false, vibration: feedback.vibration !== false }
      : DEFAULT_FEEDBACK,
  };
}

export async function loadState(): Promise<StoredState> {
  try {
    const [openings, progress, daily, feedback] = await Promise.all(
      [KEYS.openings, KEYS.progress, KEYS.daily, KEYS.feedback].map((k) => AsyncStorage.getItem(k)),
    );
    return decodeState({ openings, progress, daily, feedback });
  } catch (error) {
    logError(error, 'load_state');
    return decodeState({ openings: null, progress: null, daily: null, feedback: null });
  }
}

async function save(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logError(error, `save_${key}`);
  }
}

export const saveOpenings = (openings: Opening[]) => save(KEYS.openings, openings);
export const saveProgress = (progress: Progress) => save(KEYS.progress, progress);
export const saveDaily = (daily: DailyNew) => save(KEYS.daily, daily);
export const saveFeedback = (feedback: Feedback) => save(KEYS.feedback, feedback);
