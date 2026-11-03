// English translation of fr.ts (same keys, enforced by the Strings type). English typography: no space before
// ": ! ?", comma as thousands separator.
import type { Strings } from './types';


export const en: Strings = {
  home: {
    settings: 'Settings',
    about: 'About',
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
      'No account, no ads, no statistics: your repertoire and your progress stay on your phone.',
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Back',
  },
  settings: {
    title: 'Settings',
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
