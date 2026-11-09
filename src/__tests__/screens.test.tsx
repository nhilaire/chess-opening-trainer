import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { appFetcher } from '../api/appFetcher';
import type { ApiResponse, Fetcher } from '../api/openingsClient';
import App from '../App';
import { parseDetail } from '../game/api';
import { createEmbeddedOpenings } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import { localDay } from '../game/scheduler';
import type { Opening } from '../game/types';
import { deviceLanguageTags } from '../i18n/deviceLocale';
import { KEYS } from '../storage/repertoireStore';

// Component tests of the whole app. The openings API is the mock contract (fake repertoires), or offline.
const contract = require('../../mock-api/contract.cjs');
const v1 = require('../../mock-api/scenarios/repertoire-v1.json');

const TODAY = localDay(new Date());
const SHORT_JSON = {
  id: 'test-short',
  name: 'Court',
  playerColor: 'white',
  tree: [{ move: 'd4', children: [{ move: 'd5', children: [{ move: 'c4', children: [{ move: 'e6' }, { move: 'c6', children: [{ move: 'Nf3' }] }] }] }] }],
};
const SHORT_OPENING = parseDetail(SHORT_JSON)!; // lines: "d4 d5 c4 e6", "d4 d5 c4 c6 Nf3"
const LINE_1 = 'white|d4 d5 c4 e6';
const LINE_2 = 'white|d4 d5 c4 c6 Nf3';
// Two first moves for White: after two errors both get an arrow.
const TWO = parseDetail({ id: 'test-two', name: 'Deux', playerColor: 'white', tree: [{ move: 'd4', children: [{ move: 'd5' }] }, { move: 'e4', children: [{ move: 'e5' }] }] })!;

async function store(values: Partial<Record<keyof typeof KEYS, unknown>>) {
  await AsyncStorage.multiSet(Object.entries(values).map(([k, v]) => [KEYS[k as keyof typeof KEYS], JSON.stringify(v)]));
}

async function stored<T>(key: keyof typeof KEYS): Promise<T> {
  return JSON.parse((await AsyncStorage.getItem(KEYS[key])) ?? 'null');
}

function contractFetcher(): Fetcher {
  return async (path, etag) => {
    const r = contract.handle({ method: 'GET', path, headers: etag ? { 'if-none-match': etag } : {} });
    if (!r) return { status: 404 };
    return { status: r.status ?? 200, etag: r.headers?.ETag, json: r.body === undefined ? undefined : JSON.parse(JSON.stringify(r.body)) };
  };
}

// An API that answers only when the test says so.
function heldApi(): { fetcher: Fetcher; release: () => Promise<void> } {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  const inner = contractFetcher();
  return {
    fetcher: async (path, etag): Promise<ApiResponse> => {
      await gate;
      return inner(path, etag);
    },
    release: async () => {
      await act(async () => {
        open();
        await new Promise((r) => setTimeout(r, 0));
      });
    },
  };
}

// Taps the green arrow's move (discovery) or the given move, square by square.
async function tapMove(from: string, to: string) {
  await fireEvent.press(screen.getByTestId(`sq-${from}`));
  await fireEvent.press(screen.getByTestId(`sq-${to}`));
}

async function followArrow() {
  const arrow = await screen.findByTestId(/^arrow-/);
  const [, from, to] = arrow.props.testID.split('-');
  await tapMove(from, to);
}

// Waits for the opponent's reply (its piece on its new square).
async function waitReply(piece: string) {
  await waitFor(() => expect(screen.getByTestId(`piece-${piece}`)).toBeTruthy(), { timeout: 2000 });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  contract.reset();
  contract.load(v1);
  // Queue order is random (unit-tested in session.test.ts); a source close to 1 keeps the tree order here.
  jest.spyOn(Math, 'random').mockReturnValue(0.999999);
  jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
  jest.mocked(appFetcher).mockImplementation(() => Promise.reject(new Error('offline')));
});

describe('home with the API offline (AC-04, AC-37)', () => {
  it('lists the 3 embedded openings with colour and counts, offers every line and says it could not update', async () => {
    await render(<App />);
    expect(await screen.findByText('Ouvertures en d4')).toBeTruthy();
    expect(screen.getByText('Défense Scandinave')).toBeTruthy();
    expect(screen.getByText('d4 avec les Noirs')).toBeTruthy();
    expect(screen.getAllByText(/^Noirs · 0 maîtrisée · 0 à revoir · \d+ nouvelles$/)).toHaveLength(2);
    const total = createEmbeddedOpenings().reduce((n, o) => n + extractLines(o).length, 0);
    expect(screen.getByText(`Réviser (${total} lignes)`)).toBeTruthy();
    expect(await screen.findByText('Mise à jour impossible : dernières ouvertures enregistrées')).toBeTruthy();
    expect(screen.queryByTestId('home-add')).toBeNull();
  });

  it('shows the embedded names in English on an English phone', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-GB']);
    await render(<App />);
    expect(await screen.findByText('Scandinavian Defence')).toBeTruthy();
    expect(screen.getByText('d4 with Black')).toBeTruthy();
  });

  it('offers every line even when all are learnt and none is due', async () => {
    const later = { box: 3, due: '2999-01-01', learnt: '2026-01-01' };
    await store({ openings: [SHORT_OPENING], progress: { [LINE_1]: later, [LINE_2]: later } });
    await render(<App />);
    const button = await screen.findByTestId('home-review');
    expect(screen.getByText('Réviser (2 lignes)')).toBeTruthy();
    expect(button.props.accessibilityState.disabled).toBe(false);
  });
});

describe('home with the API (AC-20, AC-36, AC-40, AC-41, AC-44)', () => {
  it('shows the stored openings at once with « Mise à jour… », then the API openings, saved for next time', async () => {
    const api = heldApi();
    jest.mocked(appFetcher).mockImplementation(api.fetcher);
    await render(<App />);
    expect(await screen.findByText('Ouvertures en d4')).toBeTruthy();
    expect(screen.getByText('Mise à jour des ouvertures…')).toBeTruthy();
    await api.release();
    expect(await screen.findByText('Italienne test')).toBeTruthy();
    expect(screen.getByText('Française test')).toBeTruthy();
    expect(screen.queryByText('Ouvertures en d4')).toBeNull();
    expect(screen.queryByText('Mise à jour des ouvertures…')).toBeNull();
    expect(screen.getByText('Réviser (5 lignes)')).toBeTruthy();
    expect((await stored<Opening[]>('openings')).map((o) => o.id)).toEqual(['test-italienne', 'test-francaise']);
    expect(Object.keys((await stored<{ etags: Record<string, string> }>('api')).etags)).toHaveLength(3);
  });

  it('says how many unreadable openings were skipped', async () => {
    contract.commands.put({ opening: { id: 'test-bad', name: 'Bad', playerColor: 'white', tree: [{ move: 'e5' }] } });
    jest.mocked(appFetcher).mockImplementation(contractFetcher());
    await render(<App />);
    expect(await screen.findByText('1 ouverture illisible ignorée')).toBeTruthy();
    expect(screen.getByText('Italienne test')).toBeTruthy();
  });

  it('shows the empty state and disables « Réviser » when the API has no opening', async () => {
    contract.reset();
    jest.mocked(appFetcher).mockImplementation(contractFetcher());
    await render(<App />);
    expect(await screen.findByTestId('home-empty')).toBeTruthy();
    expect(screen.getByText('Aucune ouverture. Ajoute-en depuis ton éditeur.')).toBeTruthy();
    expect(screen.getByText('Rien à réviser')).toBeTruthy();
    expect(screen.getByTestId('home-review').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the stored openings when the API fails', async () => {
    await store({ openings: [SHORT_OPENING] });
    jest.mocked(appFetcher).mockImplementation(async () => ({ status: 500 }));
    await render(<App />);
    expect(await screen.findByText('Mise à jour impossible : dernières ouvertures enregistrées')).toBeTruthy();
    expect(screen.getByText('Court')).toBeTruthy();
    expect((await stored<Opening[]>('openings')).map((o) => o.id)).toEqual(['test-short']);
  });
});

describe('opening detail (AC-18, AC-49)', () => {
  it('is read-only and trains an opening whose lines are all learnt and not due yet', async () => {
    const later = { box: 3, due: '2999-01-01', learnt: '2026-01-01' };
    await store({ openings: [SHORT_OPENING], progress: { [LINE_1]: later, [LINE_2]: later } });
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-opening-test-short'));
    expect(screen.queryByTestId('detail-rename')).toBeNull();
    expect(screen.queryByTestId('detail-delete')).toBeNull();
    expect(screen.getByTestId('detail-train').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('detail-train'));
    expect(await screen.findByText('Ligne 1 / 2')).toBeTruthy();
    expect(screen.getByText('À toi de jouer')).toBeTruthy();
  });

  it('goes back to home when a refresh removes the opening shown', async () => {
    await store({ openings: [SHORT_OPENING] });
    const api = heldApi();
    jest.mocked(appFetcher).mockImplementation(api.fetcher);
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-opening-test-short'));
    expect(screen.getByTestId('detail-screen')).toBeTruthy();
    await api.release();
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText('Italienne test')).toBeTruthy();
  });
});

describe('training (AC-25, AC-26, AC-28, AC-29, AC-49)', () => {
  it('discovers new lines by following the arrows, then shows the summary; progress survives a restart', async () => {
    await store({ openings: [SHORT_OPENING] });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    expect(screen.getByText('Regarde et rejoue')).toBeTruthy();
    expect(screen.getByText('Ligne 1 / 2')).toBeTruthy();
    expect(screen.getAllByText('Court')).toHaveLength(1); // a line without label shows the opening name once
    await tapMove('e2', 'e4'); // not the arrow move
    expect(screen.getByText('Joue le coup indiqué')).toBeTruthy();
    await followArrow(); // d4
    await waitReply('d5-bp');
    await followArrow(); // c4
    expect(await screen.findByText('Ligne apprise', {}, { timeout: 2000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-next'));
    await followArrow(); // d4
    await waitReply('d5-bp');
    await followArrow(); // c4
    await waitReply('c6-bp');
    await followArrow(); // Nf3
    expect(await screen.findByText('Ligne apprise', {}, { timeout: 2000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-next'));
    expect(await screen.findByText('Séance terminée')).toBeTruthy();
    expect(screen.getByText('0 réussie · 0 à revoir · 2 nouvelles apprises')).toBeTruthy();
    const progress = await stored<Record<string, { box: number }>>('progress');
    expect(Object.keys(progress).sort()).toEqual([LINE_1, LINE_2].sort());
    await screen.unmount();
    await render(<App />);
    expect(await screen.findByText('Réviser (2 lignes)')).toBeTruthy();
    expect(screen.getByText('Blancs · 0 maîtrisée · 0 à revoir · 0 nouvelle')).toBeTruthy();
  });

  it('gives a second try, then the arrow, and counts the line « à revoir »', async () => {
    const learnt = { box: 2, due: TODAY, learnt: '2026-01-01' };
    await store({ openings: [SHORT_OPENING], progress: { [LINE_1]: learnt, [LINE_2]: { ...learnt, due: '2999-01-01' } } });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    expect(screen.getByText('À toi de jouer')).toBeTruthy();
    await tapMove('e2', 'e4');
    expect(screen.getByText('Pas ce coup-là, réessaie')).toBeTruthy();
    await tapMove('g1', 'f3');
    expect(screen.getByText('Voici le bon coup')).toBeTruthy();
    expect(screen.getByTestId('arrow-d2-d4')).toBeTruthy();
    await tapMove('d2', 'd4');
    await waitReply('d5-bp');
    await tapMove('c2', 'c4');
    expect(await screen.findByText('Ligne à revoir', {}, { timeout: 2000 })).toBeTruthy();
    const progress = await stored<Record<string, { box: number; due: string }>>('progress');
    expect(progress[LINE_1]).toMatchObject({ box: 1, due: TODAY, lastFailed: TODAY });
    // The failed line comes back once at the end of the session.
    await fireEvent.press(screen.getByTestId('train-next'));
    expect(screen.getByText('Ligne 2 / 3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-stop'));
    expect(await screen.findByText('0 réussie · 1 à revoir · 0 nouvelle apprise')).toBeTruthy();
  });

  it('shows an arrow on every repertoire move after two errors (« Voici les bons coups »)', async () => {
    const learnt = { box: 2, due: TODAY, learnt: '2026-01-01' };
    await store({ openings: [TWO], progress: { 'white|d4 d5': learnt, 'white|e4 e5': learnt } });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    await tapMove('a2', 'a3');
    await tapMove('h2', 'h3');
    expect(screen.getByText('Voici les bons coups')).toBeTruthy();
    expect(screen.getByTestId('arrow-d2-d4')).toBeTruthy();
    expect(screen.getByTestId('arrow-e2-e4')).toBeTruthy();
    // The other repertoire move is accepted too: the line reached is e4 e5, the first target was d4 d5.
    await tapMove('e2', 'e4');
    await waitReply('e5-bp');
    expect(await screen.findByText('Ligne à revoir', {}, { timeout: 2000 })).toBeTruthy();
    const progress = await stored<Record<string, { box: number; due: string }>>('progress');
    expect(progress['white|e4 e5']).toMatchObject({ box: 1, due: TODAY });
    expect(progress['white|d4 d5']).toEqual(learnt);
  });

  it('« Arrêter » and Android back leave the current line unchanged', async () => {
    jest.spyOn(BackHandler, 'addEventListener');
    const learnt = { box: 3, due: TODAY, learnt: '2026-01-01' };
    await store({ openings: [SHORT_OPENING], progress: { [LINE_1]: learnt, [LINE_2]: learnt } });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    await tapMove('d2', 'd4');
    await fireEvent.press(screen.getByTestId('train-stop'));
    expect(await screen.findByTestId('summary-screen')).toBeTruthy();
    expect((await stored<Record<string, unknown>>('progress'))[LINE_1]).toEqual(learnt);
    await fireEvent.press(screen.getByTestId('summary-home'));
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    await act(async () => {
      const handlers = jest.mocked(BackHandler.addEventListener).mock.calls.map(([, handler]) => handler);
      (handlers[handlers.length - 1] as () => boolean)();
    });
    expect(await screen.findByTestId('summary-screen')).toBeTruthy();
    expect((await stored<Record<string, unknown>>('progress'))[LINE_2]).toEqual(learnt);
  });

  it('keeps the running session when a refresh replaces the openings', async () => {
    await store({ openings: [SHORT_OPENING] });
    const api = heldApi();
    jest.mocked(appFetcher).mockImplementation(api.fetcher);
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    await api.release(); // the API no longer has « Court »
    expect(screen.getByText('Ligne 1 / 2')).toBeTruthy();
    await followArrow(); // d4
    await waitReply('d5-bp');
    await followArrow(); // c4
    expect(await screen.findByText('Ligne apprise', {}, { timeout: 2000 })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-next'));
    expect(screen.getByText('Ligne 2 / 2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-stop'));
    await fireEvent.press(await screen.findByTestId('summary-home'));
    expect(await screen.findByText('Italienne test')).toBeTruthy();
    expect((await stored<Record<string, unknown>>('progress'))[LINE_1]).toBeTruthy();
  });
});

describe('settings (AC-31)', () => {
  it('switches sounds and vibrations off; the choice survives a restart', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    await fireEvent(screen.getByTestId('settings-sound'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-vibration'), 'valueChange', false);
    expect(await stored('feedback')).toEqual({ sound: false, vibration: false });
    await screen.unmount();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    expect(screen.getByTestId('settings-sound').props.value).toBe(false);
    expect(screen.getByTestId('settings-vibration').props.value).toBe(false);
  });
});
