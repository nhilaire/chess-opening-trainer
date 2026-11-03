// English translation of fr.ts (same keys, enforced by the Strings type). English typography: no space before
// ": ! ?", comma as thousands separator.
import { formatter } from './format';
import type { Strings } from './types';

const { label } = formatter('en-US');

export const en: Strings = {
  consent: {
    title: 'Your privacy',
    body:
      'We would like to measure how the game is used, anonymously, and detect crashes in order to improve it. ' +
      'No personal data is collected and nothing is used for advertising.',
    accept: 'Accept',
    refuse: 'Decline',
    footnote: 'You can change your mind at any time in the settings.',
  },
  home: {
    play: 'Play',
    settings: 'Settings',
    about: 'About',
    bestScore: (score: number) => label('Best score', score),
  },
  game: {
    tap: 'Tap!',
    score: (score: number) => label('Score', score),
    timeLeft: (seconds: number) => label('Time', `${seconds} s`),
    over: 'Game over',
    finalScore: (score: number) => label('Your score', score),
    playAgain: 'Play again',
    home: 'Home',
  },
  about: {
    title: 'About',
    storyTitle: 'The story of this game',
    story: ['A small home-made game, with no ads and no account.'],
    authorTitle: 'A word from the author',
    author: [
      "This game does not come from a studio: it was imagined and programmed in my free time, by a passionate developer, without pretension.",
      'So it is far from perfect and probably not free of bugs. If something does not work as expected, thank you in advance for your patience.',
    ],
    dataTitle: 'Your data',
    data: [
      'No account, no ads. Anonymous statistics are only sent if you agreed, and you can change your mind in the settings.',
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Back',
  },
  settings: {
    title: 'Settings',
    telemetry: 'Share anonymous statistics',
    telemetryHelp: 'Helps fix bugs and improve the game. No personal data is sent.',
    language: 'Language',
    languageAuto: 'Automatic (phone language)',
    back: 'Back',
  },
  errors: {
    title: 'Oops',
    body: 'Something went wrong. Restart the game.',
    retry: 'Try again',
  },
};
