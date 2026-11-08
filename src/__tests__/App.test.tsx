import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import App from '../App';
import { appName } from '../config/app';
import { createEmbeddedOpenings } from '../game/embedded';
import { extractLines } from '../game/repertoire';
import { deviceLanguageTags } from '../i18n/deviceLocale';
import { KEYS } from '../storage/repertoireStore';

// render/fireEvent are awaited: asynchronous in React Native Testing Library 14+, harmless before.
// The phone is French unless a test says otherwise (jest.setup.js mocks deviceLanguageTags).
describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
  });

  it('opens on the home screen in French on a French phone, without any consent screen', async () => {
    await render(<App />);
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText(appName('fr'))).toBeTruthy();
    expect(screen.getByText('Réglages')).toBeTruthy();
    expect(screen.queryByText(/vie privée/i)).toBeNull();
  });

  it('speaks English on an English phone', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']);
    await render(<App />);
    expect(await screen.findByText('Settings')).toBeTruthy();
    expect(screen.getByText(appName('en'))).toBeTruthy();
  });

  it('uses the fallback language on a phone in an unsupported language', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['de-DE']);
    await render(<App />);
    expect(await screen.findByText('Settings')).toBeTruthy();
  });

  it('switches language from the settings at once and remembers the choice', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réglages'));
    await fireEvent.press(screen.getByTestId('settings-language-en'));
    expect(await screen.findByText('Settings')).toBeTruthy();
    expect(await AsyncStorage.getItem('settings.language.v1')).toBe('en');

    await screen.unmount();
    await render(<App />);
    expect(await screen.findByText('Settings')).toBeTruthy();
  });

  it('goes back to the phone language with the automatic choice', async () => {
    await AsyncStorage.setItem('settings.language.v1', 'en');
    await render(<App />);
    await fireEvent.press(await screen.findByText('Settings'));
    await fireEvent.press(screen.getByTestId('settings-language-auto'));
    expect(await screen.findByText('Réglages')).toBeTruthy();
  });

  it('shows the About screen from the settings: story, author, credits, version (AC-32)', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByText('Réglages'));
    await fireEvent.press(screen.getByTestId('settings-about'));
    expect(screen.getByTestId('about-screen')).toBeTruthy();
    expect(screen.getByText(/s'envolaient dès que je ne les révisais plus/)).toBeTruthy();
    expect(screen.getByText('Créé par un développeur indépendant passionné.')).toBeTruthy();
    expect(screen.getByText(/cburnett/)).toBeTruthy();
    expect(screen.getByText(/^Version [0-9]+[.][0-9]+[.][0-9]+$/)).toBeTruthy();
  });

  describe('the day changes while the app is open (AC-19)', () => {
    // Only Date is faked: React Native Testing Library keeps its real timers.
    const realTimers = ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] as const;
    let listeners: ((state: AppStateStatus) => void)[];

    beforeEach(async () => {
      jest.useFakeTimers({ doNotFake: [...realTimers], now: new Date(2026, 10, 8, 23, 59) });
      listeners = [];
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
        listeners.push(listener as (state: AppStateStatus) => void);
        return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
      });
      // One line of the first embedded opening, learnt yesterday, due tomorrow (09/11).
      const [opening] = createEmbeddedOpenings();
      const [line] = extractLines(opening);
      await AsyncStorage.setItem(KEYS.progress, JSON.stringify({ [line.id]: { box: 1, due: '2026-11-09', learnt: '2026-11-07' } }));
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    const firstOpeningMeta = () => within(screen.getByTestId(`home-opening-${createEmbeddedOpenings()[0].id}`));

    it('counts the line due today on home when the app comes back to the foreground after midnight', async () => {
      await render(<App />);
      await screen.findByTestId('home-screen');
      expect(firstOpeningMeta().getByText(/· 0 à revoir ·/)).toBeTruthy();

      jest.setSystemTime(new Date(2026, 10, 9, 7, 30));
      await act(async () => listeners.forEach((listener) => listener('active')));
      expect(firstOpeningMeta().getByText(/· 1 à revoir ·/)).toBeTruthy();
    });

    it('reads the day again on navigation', async () => {
      await render(<App />);
      await screen.findByTestId('home-screen');
      jest.setSystemTime(new Date(2026, 10, 9, 0, 1));
      await fireEvent.press(screen.getByText('Réglages'));
      await fireEvent.press(screen.getByTestId('settings-back'));
      expect(firstOpeningMeta().getByText(/· 1 à revoir ·/)).toBeTruthy();
    });
  });
});
