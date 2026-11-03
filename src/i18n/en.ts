// English translation of fr.ts (same keys, enforced by the Strings type). English typography: no space before
// ": ! ?", comma as thousands separator.
import { formatter } from './format';
import type { Strings } from './types';

const { count, label } = formatter('en-US');

export const en: Strings = {
  home: {
    review: (n: number) => `Review (${count(n, 'line', 'lines')})`,
    nothing: 'Nothing to review',
    empty: 'No opening yet. Add one by pasting a PGN.',
    add: 'Add an opening',
    counts: (mastered: number, due: number, fresh: number) => `${mastered} mastered · ${due} to review · ${fresh} new`,
    settings: 'Settings',
  },
  color: {
    white: 'White',
    black: 'Black',
  },
  openings: {
    d4: 'd4 openings',
    scandinavian: 'Scandinavian Defence',
    d4Black: 'd4 with Black',
  },
  detail: {
    train: 'Train this opening',
    lines: (n: number) => count(n, 'line', 'lines'),
    rename: 'Rename',
    delete: 'Delete',
    deleteConfirm: (name: string) => `Delete "${name}" and your progress?`,
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
  },
  import: {
    title: 'Add an opening',
    paste: 'Paste your PGN here',
    name: 'Opening name',
    color: 'You play',
    submit: 'Import',
    errors: {
      empty: 'Paste a PGN first.',
      illegal: (move: string) => label('Illegal move', move),
      fen: 'Only games from the starting position are accepted.',
      tooBig: 'PGN too long (100,000 characters and 1,000 opening lines at most).',
      noPlayerMove: 'No line contains a move for your colour.',
      name: 'Give a name (40 characters at most).',
    },
  },
  train: {
    yourMove: 'Your move',
    discover: 'Watch and replay',
    playArrow: 'Play the move shown',
    wrong: 'Not that move, try again',
    otherBranch: 'Good move, but not the one of this line',
    answer: 'Here is the right move',
    progress: (index: number, total: number) => `Line ${index} / ${total}`,
    stop: 'Stop',
    success: 'Line succeeded',
    failed: 'Line to review',
    learnt: 'Line learnt',
    next: 'Next',
  },
  summary: {
    title: 'Session complete',
    counts: (ok: number, failed: number, learnt: number) => `${ok} succeeded · ${failed} to review · ${learnt} new learnt`,
    home: 'Back to home',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageAuto: 'Automatic (phone language)',
    sound: 'Sounds',
    vibration: 'Vibrations',
    about: 'About',
    back: 'Back',
  },
  about: {
    title: 'About',
    storyTitle: 'The story of this app',
    story: [
      'My openings slipped away as soon as I stopped reviewing them. After a first web version, I made My Openings to build my own repertoire and repeat it a few minutes a day.',
    ],
    authorTitle: 'A word from the author',
    author: [
      'Made by a passionate independent developer.',
      'This app does not come from a studio: it was imagined and programmed in my free time, without pretension. It is probably not free of bugs; thank you in advance for your patience.',
    ],
    dataTitle: 'Your data',
    data: ['No account, no ads, no statistics: your repertoire and your progress stay on your phone.'],
    creditsTitle: 'Credits',
    pieces: '"cburnett" pieces by Colin M.L. Burnett, CC BY-SA 3.0 licence',
    version: (version: string) => `Version ${version}`,
    back: 'Back',
  },
  errors: {
    title: 'Oops',
    body: 'Something went wrong. Restart the app.',
    retry: 'Try again',
  },
};
