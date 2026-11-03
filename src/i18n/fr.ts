// Every player-facing string lives in a dictionary, French first (the reference). Components never inline text:
// they read `t` from useI18n(). Exact texts: docs/PRD.md "Player copy". Tone: tu.
// Chess notation stays standard SAN (K Q R B N) in every language.
import { formatter, NBSP } from './format';

const { count, integer, label } = formatter('fr-FR');

export const fr = {
  home: {
    review: (n: number) => `Réviser (${count(n, 'ligne', 'lignes')})`,
    nothing: "Rien à réviser aujourd'hui",
    empty: 'Aucune ouverture. Ajoute-en une en collant un PGN.',
    add: 'Ajouter une ouverture',
    counts: (mastered: number, due: number, fresh: number) =>
      `${count(mastered, 'maîtrisée', 'maîtrisées')} · ${due} à revoir · ${count(fresh, 'nouvelle', 'nouvelles')}`,
    settings: 'Réglages',
  },
  color: {
    white: 'Blancs',
    black: 'Noirs',
  },
  // Names of the embedded openings until the player renames them.
  openings: {
    d4: 'Ouvertures en d4',
    scandinavian: 'Défense Scandinave',
    d4Black: 'd4 avec les Noirs',
  },
  detail: {
    train: "S'entraîner sur cette ouverture",
    lines: (n: number) => count(n, 'ligne', 'lignes'),
    rename: 'Renommer',
    delete: 'Supprimer',
    deleteConfirm: (name: string) => `Supprimer «${NBSP}${name}${NBSP}» et ta progression${NBSP}?`,
  },
  common: {
    cancel: 'Annuler',
    save: 'Enregistrer',
    back: 'Retour',
  },
  import: {
    title: 'Ajouter une ouverture',
    paste: 'Colle ton PGN ici',
    name: "Nom de l'ouverture",
    color: 'Tu joues',
    submit: 'Importer',
    errors: {
      empty: "Colle d'abord un PGN.",
      illegal: (move: string) => label('Coup illégal', move),
      fen: 'Seules les parties depuis la position initiale sont acceptées.',
      tooBig: `PGN trop long (${integer(100_000)} caractères et ${integer(1_000)} lignes d'ouverture au maximum).`,
      noPlayerMove: 'Aucune ligne ne contient de coup pour ta couleur.',
      name: 'Donne un nom (40 caractères au maximum).',
    },
  },
  train: {
    yourMove: 'À toi de jouer',
    discover: 'Regarde et rejoue',
    playArrow: 'Joue le coup indiqué',
    wrong: 'Pas ce coup-là, réessaie',
    otherBranch: 'Bon coup, mais pas celui de cette ligne',
    answer: 'Voici le bon coup',
    progress: (index: number, total: number) => `Ligne ${index} / ${total}`,
    stop: 'Arrêter',
    success: 'Ligne réussie',
    failed: 'Ligne à revoir',
    learnt: 'Ligne apprise',
    next: 'Suivante',
  },
  summary: {
    title: 'Séance terminée',
    counts: (ok: number, failed: number, learnt: number) =>
      `${count(ok, 'réussie', 'réussies')} · ${failed} à revoir · ${count(learnt, 'nouvelle apprise', 'nouvelles apprises')}`,
    home: "Retour à l'accueil",
  },
  settings: {
    title: 'Réglages',
    language: 'Langue',
    languageAuto: 'Automatique (langue du téléphone)',
    sound: 'Sons',
    vibration: 'Vibrations',
    about: 'À propos',
    back: 'Retour',
  },
  // « À propos »: the story comes from the discovery brief (docs/BRIEF.md, "Story (About screen)").
  about: {
    title: 'À propos',
    storyTitle: "L'histoire de cette appli",
    story: [
      "Mes ouvertures s'envolaient dès que je ne les révisais plus. Après une première version web, j'ai créé Mes Ouvertures pour construire mon propre répertoire et le répéter quelques minutes par jour.",
    ],
    authorTitle: "Un mot de l'auteur",
    author: [
      'Créé par un développeur indépendant passionné.',
      `Cette appli ne sort pas d'un studio${NBSP}: elle a été imaginée et programmée sur mon temps libre, sans prétention. Elle n'est sans doute pas exempte de bugs${NBSP}; merci d'avance pour ton indulgence.`,
    ],
    dataTitle: 'Tes données',
    data: [
      `Aucun compte, aucune publicité, aucune statistique${NBSP}: ton répertoire et ta progression restent sur ton téléphone.`,
    ],
    creditsTitle: 'Crédits',
    pieces: `Pièces «${NBSP}cburnett${NBSP}» de Colin M.L. Burnett, licence CC BY-SA 3.0`,
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: "Un problème est survenu. Relance l'appli.",
    retry: 'Réessayer',
  },
} as const;
