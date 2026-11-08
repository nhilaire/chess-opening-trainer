import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmbeddedOpenings } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import { countLines } from '../game/scheduler';
import type { Opening } from '../game/types';
import {
  decodeState,
  DEFAULT_FEEDBACK,
  KEYS,
  loadState,
  migrateProgress,
  saveFeedback,
  saveOpenings,
  saveProgress,
  saveRefresh,
} from '../storage/repertoireStore';

const empty = { openings: null, progress: null, api: null, feedback: null };
const TODAY = '2026-11-04';

describe('persistence (AC-30)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores the embedded seed at first launch, with the API ids and defaults', async () => {
    const state = await loadState();
    expect(state.openings.map((o) => o.id)).toEqual(['ouvertures-en-d4', 'defense-scandinave', 'ouvertures-d4-noirs']);
    expect(state.progress).toEqual({});
    expect(state.api).toEqual({ etags: {} });
    expect(state.feedback).toEqual(DEFAULT_FEEDBACK);
    expect(JSON.parse((await AsyncStorage.getItem(KEYS.openings))!)).toHaveLength(3);
  });

  it('restores the openings of the last refresh, ETags, line states and settings', async () => {
    const api: Opening = { ...createEmbeddedOpenings()[1], id: 'test-api', name: 'Scandi API', origin: 'api', embeddedKey: undefined };
    const progress = { 'black|e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Nf6 Bc4 Bf5': { box: 3, due: '2026-11-10', learnt: '2026-10-01', lastFailed: '2026-10-20' } };
    await saveRefresh([api], { etags: { '/api/openings': '"l1"', '/api/openings/test-api': '"d1"' }, listIds: ['test-api'] });
    await saveProgress(progress);
    await saveFeedback({ sound: false, vibration: true });
    const state = await loadState();
    expect(state.openings).toEqual([JSON.parse(JSON.stringify(api))]);
    expect(state.api).toEqual({ etags: { '/api/openings': '"l1"', '/api/openings/test-api': '"d1"' }, listIds: ['test-api'] });
    expect(state.progress).toEqual(progress);
    expect(state.migrated).toBe(false);
    expect(state.feedback).toEqual({ sound: false, vibration: true });
  });

  it('ignores the daily new-line counter saved by v0.1.0', async () => {
    await AsyncStorage.setItem('repertoire.dailyNew.v1', JSON.stringify({ day: '2026-11-03', count: 5 }));
    const state = await loadState();
    expect(state).not.toHaveProperty('daily');
    expect(state.openings).toHaveLength(3);
  });

  it('keeps an empty list (the API has no opening)', async () => {
    await saveOpenings([]);
    expect((await loadState()).openings).toEqual([]);
  });

  it('falls back on corrupt data without crashing, and drops ETags without openings', () => {
    const state = decodeState({ openings: '{not json', progress: '[1,2]', api: '{"etags":{"/api/openings":"x"}}', feedback: 'null' });
    expect(state.openings.map((o) => o.origin)).toEqual(['embedded', 'embedded', 'embedded']);
    expect(state.progress).toEqual({});
    expect(state.api).toEqual({ etags: {} });
    expect(state.feedback).toEqual(DEFAULT_FEEDBACK);
    expect(decodeState({ ...empty, openings: JSON.stringify([{ id: 1 }]) }).openings).toHaveLength(3);
    expect(decodeState({ ...empty, progress: JSON.stringify({ 'white|e4': { box: 1, due: 'x', learnt: 'y' }, b: 'bad' }) }).progress).toEqual({
      'white|e4': { box: 1, due: 'x', learnt: 'y' },
    });
  });

  it('uses versioned keys', () => {
    expect(Object.values(KEYS).every((k) => k.endsWith('.v1'))).toBe(true);
  });
});

describe('upgrade from v0.1.0 / v0.2.0 (AC-45)', () => {
  // As saved by v0.2.0: embedded ids, a renamed embedded opening, an imported opening, opening-id progress keys.
  const old = [
    { id: 'embedded-d4', name: 'Mon d4', embeddedKey: 'd4', color: 'white', origin: 'embedded', tree: [] },
    { id: 'embedded-scandinavian', name: '', embeddedKey: 'scandinavian', color: 'black', origin: 'embedded', tree: [] },
    { id: 'imported-1', name: 'Sicilienne', color: 'black', origin: 'imported', tree: [{ san: 'e4', children: [{ san: 'c5', children: [] }] }] },
  ];
  const progress = {
    'embedded-scandinavian|e4 d5 exd5 Qxd5 Nc3 Qa5 Bc4 Nf6 d3 c6 Bd2 Qc7 Qe2 b5 Bb3 e6': { box: 4, due: '2026-12-01', learnt: '2026-10-01' },
    'embedded-d4|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Be3 Na6 h3 Nc5 Qc2': { box: 2, due: '2026-11-05', learnt: '2026-11-01' },
    'imported-1|e4 c5': { box: 1, due: TODAY, learnt: TODAY },
    'embedded-d4Black|d4 d5 Bf4 Nf6 e3 c5 c3 Qb6 Qb3 c4 Qc2': { box: 5, due: '2027-01-01', learnt: '2026-09-01' }, // opening deleted
  };

  it('rewrites the keys `<colour>|<moves>`, refreshes the seed (API ids, latest tree, renames dropped)', () => {
    const state = decodeState({ ...empty, openings: JSON.stringify(old), progress: JSON.stringify(progress) });
    expect(state.migrated).toBe(true);
    expect(state.openings.map((o) => [o.id, o.name, o.origin])).toEqual([
      ['ouvertures-en-d4', '', 'embedded'],
      ['defense-scandinave', '', 'embedded'],
      ['imported-1', 'Sicilienne', 'api'],
    ]);
    expect(Object.keys(state.progress).sort()).toEqual(
      [
        'black|e4 c5',
        'black|e4 d5 exd5 Qxd5 Nc3 Qa5 Bc4 Nf6 d3 c6 Bd2 Qc7 Qe2 b5 Bb3 e6',
        'white|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Be3 Na6 h3 Nc5 Qc2',
      ].sort(),
    );
    // The Scandinavian line keeps its box 4 in the refreshed seed.
    const counts = countLines(extractLines(state.openings[1]), state.progress, TODAY);
    expect(counts).toMatchObject({ mastered: 1, total: 12 });
  });

  it('keeps the higher box on a clash, and leaves colour|moves keys alone', () => {
    const colorOf = (id: string) => (id === 'a' || id === 'b' ? 'white' : undefined) as 'white' | undefined;
    const { progress: out, migrated } = migrateProgress(
      { 'a|e4': { box: 2, due: TODAY, learnt: TODAY }, 'b|e4': { box: 5, due: TODAY, learnt: TODAY }, 'white|d4': { box: 1, due: TODAY, learnt: TODAY } },
      colorOf,
    );
    expect(migrated).toBe(true);
    expect(out).toEqual({ 'white|e4': { box: 5, due: TODAY, learnt: TODAY }, 'white|d4': { box: 1, due: TODAY, learnt: TODAY } });
    expect(migrateProgress({ 'white|d4': { box: 1, due: TODAY, learnt: TODAY } }, colorOf).migrated).toBe(false);
  });

  it('saves the rewritten keys at load', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(KEYS.openings, JSON.stringify(old));
    await AsyncStorage.setItem(KEYS.progress, JSON.stringify(progress));
    await loadState();
    expect(Object.keys(JSON.parse((await AsyncStorage.getItem(KEYS.progress))!)).every((k) => /^(white|black)\|/.test(k))).toBe(true);
  });
});

describe('lines gone from the API (AC-45)', () => {
  it('keeps their progress, ignores it in counts, and counts it again when the line comes back', () => {
    const [d4] = createEmbeddedOpenings();
    const lines = extractLines(d4);
    const gone = { 'white|a3 a6': { box: 6, due: TODAY, learnt: TODAY } };
    const progress = { ...gone, [lines[0].id]: { box: 4, due: '2026-12-01', learnt: TODAY } };
    expect(countLines(lines, progress, TODAY)).toMatchObject({ mastered: 1, due: 0, total: 11 });
    const back: Opening = { ...d4, tree: [...d4.tree, { san: 'a3', children: [{ san: 'a6', children: [] }] }] };
    expect(countLines(extractLines(back), progress, TODAY)).toMatchObject({ mastered: 2, due: 1, total: 12 });
  });
});
