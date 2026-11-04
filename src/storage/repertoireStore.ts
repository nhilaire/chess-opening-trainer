import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmbeddedOpenings } from '../game/embedded';
import { ApiCache, EMPTY_CACHE } from '../game/refresh';
import type { LineState, Progress } from '../game/scheduler';
import type { MoveNode, Opening } from '../game/types';
import { logError } from '../util/log';

// Everything stays on the phone. Versioned keys; a missing openings key means a first launch (embedded seed
// stored); an empty list is kept (the API has no opening). The daily new-line counter of v0.1.0
// (`repertoire.dailyNew.v1`) is no longer read. Rules: docs/PRD.md "Openings API" and "Persistence".
export const KEYS = {
  openings: 'repertoire.openings.v1',
  progress: 'repertoire.progress.v1',
  api: 'repertoire.api.v1',
  feedback: 'settings.feedback.v1',
} as const;

export interface Feedback {
  sound: boolean;
  vibration: boolean;
}

export interface StoredState {
  openings: Opening[];
  progress: Progress;
  api: ApiCache;
  feedback: Feedback;
  migrated: boolean; // progress keys rewritten from v0.1.0/v0.2.0: save them back
}

export const DEFAULT_FEEDBACK: Feedback = { sound: true, vibration: true };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isNode(v: unknown): v is MoveNode {
  return isObject(v) && typeof v.san === 'string' && Array.isArray(v.children) && v.children.every(isNode);
}

type StoredOpening = Omit<Opening, 'origin'> & { origin: Opening['origin'] | 'imported' };

// `imported` openings come from v0.1.0/v0.2.0: kept read-only until the first successful API refresh.
function isOpening(v: unknown): v is StoredOpening {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.color === 'white' || v.color === 'black') &&
    (v.origin === 'embedded' || v.origin === 'api' || v.origin === 'imported') &&
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

const NEW_KEY = /^(white|black)\|/;

// v0.1.0/v0.2.0 keyed progress by `<opening id>|<moves>`; v0.3.0 by `<colour>|<moves>`. Keys of an opening no
// longer stored are dropped; on a clash the state with the higher box is kept.
export function migrateProgress(progress: Progress, colorOf: (openingId: string) => Opening['color'] | undefined): { progress: Progress; migrated: boolean } {
  const out: Progress = {};
  let migrated = false;
  for (const [key, state] of Object.entries(progress)) {
    let next = key;
    if (!NEW_KEY.test(key)) {
      migrated = true;
      const bar = key.indexOf('|');
      const color = bar > 0 ? colorOf(key.slice(0, bar)) : undefined;
      if (!color) continue;
      next = `${color}|${key.slice(bar + 1)}`;
    }
    if (!out[next] || out[next].box < state.box) out[next] = state;
  }
  return { progress: out, migrated };
}

// Stored embedded openings take the seed shipped with this version (API ids, latest tree, localized names).
function withCurrentSeed(openings: StoredOpening[]): Opening[] {
  const seed = createEmbeddedOpenings();
  return openings.map((o) => {
    if (o.origin === 'embedded') return seed.find((s) => s.embeddedKey === o.embeddedKey) ?? { ...o, origin: 'embedded' };
    return { ...o, origin: 'api' };
  });
}

function decodeApi(v: unknown): ApiCache {
  if (!isObject(v) || !isObject(v.etags)) return EMPTY_CACHE;
  const etags = Object.fromEntries(Object.entries(v.etags).filter(([, e]) => typeof e === 'string')) as Record<string, string>;
  const listIds = Array.isArray(v.listIds) && v.listIds.every((id) => typeof id === 'string') ? (v.listIds as string[]) : undefined;
  return { etags, ...(listIds ? { listIds } : {}) };
}

// Pure decoding of the stored values: anything corrupt falls back (embedded seed, empty progress, defaults).
export function decodeState(raw: { openings: string | null; progress: string | null; api: string | null; feedback: string | null }): StoredState {
  const openings = parse(raw.openings);
  const progress = parse(raw.progress);
  const feedback = parse(raw.feedback);
  const stored = Array.isArray(openings) && openings.every(isOpening) ? openings : null;
  const colors = new Map((stored ?? []).map((o) => [o.id, o.color] as const));
  const lineStates = isObject(progress) ? (Object.fromEntries(Object.entries(progress).filter(([, s]) => isLineState(s))) as Progress) : {};
  const { progress: migratedProgress, migrated } = migrateProgress(lineStates, (id) => colors.get(id));
  return {
    openings: stored ? withCurrentSeed(stored) : createEmbeddedOpenings(),
    progress: migratedProgress,
    // Openings and ETags go together: without stored openings, no conditional request may answer 304.
    api: stored ? decodeApi(parse(raw.api)) : EMPTY_CACHE,
    feedback: isObject(feedback)
      ? { sound: feedback.sound !== false, vibration: feedback.vibration !== false }
      : DEFAULT_FEEDBACK,
    migrated,
  };
}

export async function loadState(): Promise<StoredState> {
  try {
    const [openings, progress, api, feedback] = await Promise.all(
      [KEYS.openings, KEYS.progress, KEYS.api, KEYS.feedback].map((k) => AsyncStorage.getItem(k)),
    );
    const state = decodeState({ openings, progress, api, feedback });
    if (openings === null) await saveOpenings(state.openings); // first launch: the seed is stored
    if (state.migrated) await saveProgress(state.progress);
    return state;
  } catch (error) {
    logError(error, 'load_state');
    return decodeState({ openings: null, progress: null, api: null, feedback: null });
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
export const saveFeedback = (feedback: Feedback) => save(KEYS.feedback, feedback);

// Openings and ETags of a successful refresh, saved together (openings first: an ETag never outlives its copy).
export async function saveRefresh(openings: Opening[], api: ApiCache): Promise<void> {
  await saveOpenings(openings);
  await save(KEYS.api, api);
}
