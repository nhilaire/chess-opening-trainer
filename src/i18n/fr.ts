// Every player-facing string lives in a dictionary, French first (the reference). Components never inline text:
// they read `t` from useI18n(). Language-specific images and spoken audio also go here, as require() entries
// (e.g. `images: { title: require('../../assets/i18n/fr/title.png') }`), so each language must provide them.
import { NBSP } from './format';


export const fr = {
  home: {
    settings: 'Paramètres',
    about: 'À propos',
  },
  // « À propos ». The story comes from the discovery brief (docs/BRIEF.md, "Story (About screen)"), quoted in the PRD.
  // The word from the author keeps its meaning in every game (passionate developer, free time, bugs are possible);
  // adapt its tone (tu / vous) and details to the game.
  about: {
    title: 'À propos',
    storyTitle: "L'histoire de ce jeu",
    story: ['Un petit jeu fait maison, sans publicité ni compte.'],
    authorTitle: "Un mot de l'auteur",
    author: [
      `Ce jeu ne sort pas d'un studio${NBSP}: il a été imaginé et programmé sur mon temps libre, par un développeur passionné, sans prétention.`,
      "Il est donc perfectible et sans doute pas exempt de bugs. Si quelque chose ne marche pas comme prévu, merci d'avance pour votre indulgence.",
    ],
    dataTitle: 'Vos données',
    data: [
      `Aucun compte, aucune publicité, aucune statistique${NBSP}: ton répertoire et ta progression restent sur ton téléphone.`,
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue',
    languageAuto: 'Automatique (langue du téléphone)',
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: 'Un problème est survenu. Relancez le jeu.',
    retry: 'Réessayer',
  },
} as const;
