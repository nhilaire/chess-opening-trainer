import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmbeddedOpenings } from '../game/embedded';
import { addOpening, deleteOpening, renameOpening } from '../game/library';
import { extractLines, importOpening } from '../game/repertoire';
import {
  decodeState,
  DEFAULT_FEEDBACK,
  KEYS,
  loadState,
  saveFeedback,
  saveOpenings,
  saveProgress,
} from '../storage/repertoireStore';

const empty = { openings: null, progress: null, feedback: null };

describe('library changes (AC-13, AC-14)', () => {
  const base = createEmbeddedOpenings();
  const imported = importOpening('1. e4 c5 *', 'Sicilienne', 'black', 'imported-1');
  if (!imported.ok) throw new Error('bad test PGN');

  it('adds imported openings after the others', () => {
    expect(addOpening(base, imported.opening).map((o) => o.id)).toEqual([
      'embedded-d4',
      'embedded-scandinavian',
      'embedded-d4Black',
      'imported-1',
    ]);
  });

  it('renames one opening', () => {
    expect(renameOpening(base, 'embedded-d4', 'Mon d4').find((o) => o.id === 'embedded-d4')?.name).toBe('Mon d4');
  });

  it('deletes an opening with the progress of its lines only', () => {
    const progress = {
      'embedded-d4|d4 Nf6': { box: 2, due: '2026-11-05', learnt: '2026-11-01' },
      'embedded-d4Black|d4 d5': { box: 1, due: '2026-11-04', learnt: '2026-11-03' },
    };
    const result = deleteOpening(base, progress, 'embedded-d4');
    expect(result.openings.map((o) => o.id)).toEqual(['embedded-scandinavian', 'embedded-d4Black']);
    expect(Object.keys(result.progress)).toEqual(['embedded-d4Black|d4 d5']);
  });
});

describe('persistence (AC-30)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('installs the embedded openings at first launch with defaults', async () => {
    const state = await loadState();
    expect(state.openings.map((o) => o.id)).toEqual(['embedded-d4', 'embedded-scandinavian', 'embedded-d4Black']);
    expect(state.progress).toEqual({});
    expect(state.feedback).toEqual(DEFAULT_FEEDBACK);
  });

  it('restores openings, line states and settings', async () => {
    const openings = renameOpening(createEmbeddedOpenings(), 'embedded-d4', 'Mon d4').slice(0, 1);
    const progress = { 'embedded-d4|d4 Nf6': { box: 3, due: '2026-11-10', learnt: '2026-10-01', lastFailed: '2026-10-20' } };
    await saveOpenings(openings);
    await saveProgress(progress);
    await saveFeedback({ sound: false, vibration: true });
    const state = await loadState();
    expect(state.openings).toEqual(openings);
    expect(state.progress).toEqual(progress);
    expect(state.feedback).toEqual({ sound: false, vibration: true });
  });

  it('ignores the daily new-line counter saved by v0.1.0', async () => {
    await AsyncStorage.setItem('repertoire.dailyNew.v1', JSON.stringify({ day: '2026-11-03', count: 5 }));
    const state = await loadState();
    expect(state).not.toHaveProperty('daily');
    expect(state.openings).toHaveLength(3);
  });

  it('gives embedded openings saved by an older version the lines of this version, keeping names and order (AC-39)', () => {
    const current = createEmbeddedOpenings();
    const old = current.map((o) => (o.embeddedKey === 'scandinavian' ? { ...o, name: 'Ma Scandi', tree: o.tree.slice(0, 1).map((n) => ({ ...n, children: [] })) } : o));
    const imported = importOpening('1. e4 c5 *', 'Sicilienne', 'black', 'imported-1');
    if (!imported.ok) throw new Error('bad test PGN');
    const saved = [old[2], old[1], imported.opening]; // d4 White deleted, order changed by the player
    const kept = { 'embedded-scandinavian|e4 d5 exd5 Qxd5 Nc3 Qa5 Bc4 Nf6 d3 c6 Bd2 Qc7 Qe2 b5 Bb3 e6': { box: 4, due: '2026-12-01', learnt: '2026-10-01' } };
    const state = decodeState({ ...empty, openings: JSON.stringify(saved), progress: JSON.stringify(kept) });
    expect(state.progress).toEqual(kept);
    expect(extractLines(state.openings[1]).map((l) => l.id)).toContain(Object.keys(kept)[0]);
    expect(state.openings.map((o) => [o.id, o.name])).toEqual([
      ['embedded-d4Black', ''],
      ['embedded-scandinavian', 'Ma Scandi'],
      ['imported-1', 'Sicilienne'],
    ]);
    expect(state.openings[1].tree).toEqual(current[1].tree);
    expect(state.openings[2].tree).toEqual(imported.opening.tree);
  });

  it('keeps an empty list once every opening was deleted (embedded ones do not come back)', async () => {
    await saveOpenings([]);
    expect((await loadState()).openings).toEqual([]);
  });

  it('falls back on corrupt data without crashing', () => {
    const state = decodeState({
      openings: '{not json',
      progress: '[1,2]',
      feedback: 'null',
    });
    expect(state.openings.map((o) => o.origin)).toEqual(['embedded', 'embedded', 'embedded']);
    expect(state.progress).toEqual({});
    expect(state.feedback).toEqual(DEFAULT_FEEDBACK);
    expect(decodeState({ ...empty, openings: JSON.stringify([{ id: 1 }]) }).openings).toHaveLength(3);
    expect(decodeState({ ...empty, progress: JSON.stringify({ a: { box: 1, due: 'x', learnt: 'y' }, b: 'bad' }) }).progress).toEqual({
      a: { box: 1, due: 'x', learnt: 'y' },
    });
  });

  it('uses versioned keys', () => {
    expect(Object.values(KEYS).every((k) => k.endsWith('.v1'))).toBe(true);
  });
});
