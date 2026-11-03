# Brief: chess-opening-trainer

Date: 2026-11-03
Project slug: chess-opening-trainer
Final app name: Mes Ouvertures

## Original brief

> une appli pour travailler ses ouvertures, inspiration de C:\dev\Ouvertures
> je veux me faire mon propre répertoire d'ouverture et je veux pouvoir les répeter. Il y a un certain nombres
> d'ouvertures dans un fichier embarqué dans l'apk, mais à terme j'aimerai avoir un backend sur azure qui permet de
> récuperer la liste des ouvertures, de saisir une nouvelle ouverture en la copiant collant
> public surtout moi, mais challenge un peu les idées de l'existant

### Existing project studied (C:\dev\Ouvertures, Angular 19 PWA, not imported)

- Repertoires are indented text trees (`# color: white|black`, 2 spaces per level, `[Name]` labels), 3 files
  (d4 with White, Scandinavian with Black, d4 with Black: Slav and London).
- Training: the app picks a random leaf line, plays the opponent's moves, the player must find their move; a wrong
  move shows a green arrow with the expected move. End of line: congratulations, back to the menu.
- Hosted as an Azure Static Web App; no backend, no progress kept between sessions.

## Clarifying questions

Answers are summarised in English. Format: `- **Q:** question` then `  **A:** answer`.
Mark assumptions the user accepted as `(default accepted)`.

### Concept and players

- **Q:** Who is it for?
  **A:** Mostly the user themself (a chess player building a personal opening repertoire); public on GitHub.
- **Q:** Which openings ship inside the APK?
  **A:** The 3 repertoires of the existing PWA (d4 with White, Scandinavian with Black, d4 with Black: Slav and
  London), converted to PGN by the factory.
- **Q:** How does a training session go?
  **A:** A "Review (N lines due)" button across all openings, plus the option to train one chosen opening.

### Story (About screen)

- **Q:** Why this app?
  **A:** A better version of their own opening PWA. Text chosen by the user (draft 2):
  « Mes ouvertures s'envolaient dès que je ne les révisais plus. Après une première version web, j'ai créé
  Mes Ouvertures pour construire mon propre répertoire et le répéter quelques minutes par jour. »

### Gameplay and controls

- **Q:** How is the line to review chosen? (the existing app picks a random leaf line)
  **A:** Spaced repetition per line (each line has a next review date; a failure brings it back soon, a success
  spaces it out, Anki/Chessable style).
- **Q:** A line never seen before: show it first or quiz directly?
  **A:** Show it first (discovery mode: the app plays the line with arrows, the player replays their moves), then the
  line enters the spaced repetition.
- **Q:** What happens on a wrong move? (the existing app shows the green arrow immediately)
  **A:** "Not that move", one more try; at the 2nd failure the green arrow shows the expected move and the line
  counts as failed.
- **Q:** How are pieces moved?
  **A:** Both tap-tap and drag (like Lichess), with the origin square and legal destinations highlighted.

### Progression, scoring, difficulty

- **Q:** Which progress is shown?
  **A:** Per opening: lines mastered / to review / new, and the number of lines due today. No streak.
- **Q:** What is saved? 
  **A:** On the phone only: imported openings and per-line review state. (default accepted)

### Look, sound and feel

- **Q:** Visual and sound style?
  **A:** Classic Lichess-like: light/dark wood board (as in the existing app), dark background, free-licence SVG
  pieces, short move / capture / error sounds with a mute toggle, vibration on error.

### Languages

- **Q:** Languages and final names?
  **A:** French (reference) + English, fallback English. Final name: « Mes Ouvertures » in French,
  "My Openings" in English. Chess notation stays standard SAN (English letters K Q R B N) in both languages.
  No image with text, no spoken audio. (default accepted for languages and notation)

### Screens and settings

- **Q:** Tu or vous?
  **A:** Tu (« Trouve le bon coup »).
- **Q:** What can the user do with openings in v1?
  **A:** Paste a new one, rename, delete (embedded ones included); the colour played is chosen at import.

### Telemetry and success metrics

- **Q:** Which metrics are sent (opt-in, no identifier)?
  **A:** None: no Firebase, no consent screen, 100% private app (`firebase: none`). Success is judged by the user's
  own use.

### Constraints

- **Q:** Paste openings through an Azure backend in v1?
  **A:** No: local import first, kept on the phone; the Azure backend (list and add openings) comes in a later
  version.
- **Q:** Which format is pasted?
  **A:** PGN with variations (what a Lichess or chess.com study exports), not the indented text format of the PWA.
- **Q:** What is out of scope for v1?
  **A:** Azure backend, analysis engine (no Stockfish/evaluation), accounts/sync, building a line move by move on
  the board.

## Decisions taken during discovery

- New app (`kind: game` default), not an adoption: the Angular PWA is only an inspiration, its code is not imported.
  Its opening data is reused, converted to PGN.
- Works fully offline; no backend in v1. When the Azure backend comes, the factory will not build or deploy it,
  will keep its address in git-ignored private config and prove the app against a mock API
  (`factory/knowledge/apps-with-backend.md`); this will likely switch the profile to `kind: app`.
- No telemetry at all (`firebase: none`).
- Challenged from the existing app: random line → spaced repetition; immediate arrow → one retry then arrow;
  hard-coded opening list → user-managed repertoire with PGN paste; no memory between sessions → saved progress.
- A "line" is a path from the start position to a leaf of the repertoire tree, as in the PWA.
- Orientation portrait, board flipped when the user plays Black. (default accepted)
