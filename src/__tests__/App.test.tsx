import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { appName } from '../config/app';
import { deviceLanguageTags } from '../i18n/deviceLocale';

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
});
