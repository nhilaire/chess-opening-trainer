import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import App from '../App';
import { importOpening } from '../game/repertoire';
import { localDay } from '../game/scheduler';
import { deviceLanguageTags } from '../i18n/deviceLocale';
import { KEYS } from '../storage/repertoireStore';

// Component tests of the whole app with a short, known repertoire saved beforehand.
const TODAY = localDay(new Date());
const SHORT = importOpening('1. d4 d5 2. c4 e6 (2... c6 3. Nf3) *', 'Court', 'white', 'imported-short');
if (!SHORT.ok) throw new Error('bad test PGN');
const SHORT_OPENING = SHORT.opening; // lines: "d4 d5 c4 e6", "d4 d5 c4 c6 Nf3"
const LINE_1 = 'imported-short|d4 d5 c4 e6';
const LINE_2 = 'imported-short|d4 d5 c4 c6 Nf3';

async function store(values: Partial<Record<keyof typeof KEYS, unknown>>) {
  await AsyncStorage.multiSet(Object.entries(values).map(([k, v]) => [KEYS[k as keyof typeof KEYS], JSON.stringify(v)]));
}

async function stored<T>(key: keyof typeof KEYS): Promise<T> {
  return JSON.parse((await AsyncStorage.getItem(KEYS[key])) ?? 'null');
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
  jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
});

describe('home (AC-04, AC-20, AC-36, AC-37)', () => {
  it('lists the 3 embedded openings with colour and counts, and offers 5 new lines', async () => {
    await render(<App />);
    expect(await screen.findByText('Ouvertures en d4')).toBeTruthy();
    expect(screen.getByText('Défense Scandinave')).toBeTruthy();
    expect(screen.getByText('d4 avec les Noirs')).toBeTruthy();
    expect(screen.getAllByText(/^Noirs · 0 maîtrisée · 0 à revoir · \d+ nouvelles$/)).toHaveLength(2);
    expect(screen.getByText('Réviser (5 lignes)')).toBeTruthy();
  });

  it('shows the embedded names in English on an English phone', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-GB']);
    await render(<App />);
    expect(await screen.findByText('Scandinavian Defence')).toBeTruthy();
    expect(screen.getByText('d4 with Black')).toBeTruthy();
  });

  it('disables « Réviser » when nothing is due and no new line is left today', async () => {
    await store({ openings: [SHORT_OPENING], daily: { day: TODAY, count: 5 } });
    await render(<App />);
    const button = await screen.findByTestId('home-review');
    expect(screen.getByText("Rien à réviser aujourd'hui")).toBeTruthy();
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('shows the empty state when no opening is left', async () => {
    await store({ openings: [] });
    await render(<App />);
    expect(await screen.findByTestId('home-empty')).toBeTruthy();
    expect(screen.getByText('Aucune ouverture. Ajoute-en une en collant un PGN.')).toBeTruthy();
    expect(screen.getByTestId('home-review').props.accessibilityState.disabled).toBe(true);
  });
});

describe('opening detail (AC-13, AC-14, AC-18)', () => {
  it('renames an opening; the name survives a restart and shows in every language', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-opening-embedded-d4'));
    await fireEvent.press(screen.getByTestId('detail-rename'));
    await fireEvent.changeText(screen.getByTestId('detail-name-input'), '   ');
    expect(screen.getByText('Donne un nom (40 caractères au maximum).')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('detail-name-input'), ' Mon d4 ');
    await fireEvent.press(screen.getByTestId('detail-save'));
    expect(screen.getByTestId('detail-name').props.children).toBe('Mon d4');
    await screen.unmount();
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']);
    await render(<App />);
    expect(await screen.findByText('Mon d4')).toBeTruthy();
  });

  it('deletes an opening and its progress after confirmation; cancel keeps it', async () => {
    await store({ progress: { 'embedded-d4|d4 Nf6 c4': { box: 2, due: TODAY, learnt: TODAY } } });
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-opening-embedded-d4'));
    await fireEvent.press(screen.getByTestId('detail-delete'));
    expect(screen.getByText('Supprimer « Ouvertures en d4 » et ta progression ?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('detail-cancel'));
    await fireEvent.press(screen.getByTestId('detail-delete'));
    await fireEvent.press(screen.getByTestId('detail-confirm-delete'));
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByText('Ouvertures en d4')).toBeNull();
    expect(await stored('progress')).toEqual({});
    await screen.unmount();
    await render(<App />);
    expect(await screen.findByText('Défense Scandinave')).toBeTruthy();
    expect(screen.queryByText('Ouvertures en d4')).toBeNull();
  });

  it('disables training an opening with no learnt line when the daily limit is used up', async () => {
    await store({ openings: [SHORT_OPENING], daily: { day: TODAY, count: 5 } });
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-opening-imported-short'));
    expect(screen.getByTestId('detail-train').props.accessibilityState.disabled).toBe(true);
  });
});

describe('import (AC-11, AC-12)', () => {
  it('imports a pasted PGN with its name and colour', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-add'));
    await fireEvent.changeText(screen.getByTestId('import-pgn'), '[StudyName "Sicilienne"]\n\n1. e4 c5 2. Nf3 d6 *');
    expect(screen.getByTestId('import-name').props.value).toBe('Sicilienne');
    await fireEvent.press(screen.getByTestId('import-color-black'));
    await fireEvent.press(screen.getByTestId('import-submit'));
    expect(await screen.findByText('Sicilienne')).toBeTruthy();
    expect(screen.getByText('Noirs · 0 maîtrisée · 0 à revoir · 1 nouvelle')).toBeTruthy();
    const openings = await stored<{ name: string; color: string }[]>('openings');
    expect(openings.map((o) => [o.name, o.color]).pop()).toEqual(['Sicilienne', 'black']);
  });

  it('shows the error of an invalid PGN and saves nothing', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-add'));
    await fireEvent.changeText(screen.getByTestId('import-pgn'), '1. e4 e5 2. Ke3 *');
    await fireEvent.changeText(screen.getByTestId('import-name'), 'Faux');
    await fireEvent.press(screen.getByTestId('import-color-white'));
    await fireEvent.press(screen.getByTestId('import-submit'));
    expect(screen.getByTestId('import-error').props.children).toBe('Coup illégal : 2.Ke3');
    await fireEvent.press(screen.getByTestId('import-back'));
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByText('Faux')).toBeNull();
    expect(await stored<unknown[]>('openings')).toHaveLength(3);
  });
});

describe('training (AC-25, AC-26, AC-28, AC-29)', () => {
  it('discovers new lines by following the arrows, then shows the summary; progress survives a restart', async () => {
    await store({ openings: [SHORT_OPENING] });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (2 lignes)'));
    expect(screen.getByText('Regarde et rejoue')).toBeTruthy();
    expect(screen.getByText('Ligne 1 / 2')).toBeTruthy();
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
    expect(await stored('daily')).toEqual({ day: TODAY, count: 2 });
    await screen.unmount();
    await render(<App />);
    expect(await screen.findByText("Rien à réviser aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Blancs · 0 maîtrisée · 0 à revoir · 0 nouvelle')).toBeTruthy();
  });

  it('gives a second try, then the arrow, and counts the line « à revoir »', async () => {
    const learnt = { box: 2, due: TODAY, learnt: '2026-01-01' };
    await store({ openings: [SHORT_OPENING], progress: { [LINE_1]: learnt, [LINE_2]: { ...learnt, due: '2999-01-01' } } });
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réviser (1 ligne)'));
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
    expect(screen.getByText('Ligne 2 / 2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('train-stop'));
    expect(await screen.findByText('0 réussie · 1 à revoir · 0 nouvelle apprise')).toBeTruthy();
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
