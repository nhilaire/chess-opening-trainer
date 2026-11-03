// Shared types of the repertoire engine. Pure data, serialisable as JSON (saved with AsyncStorage).

export type Color = 'white' | 'black';

// One move of a repertoire tree. `san` is normalised by chess.js (castling `O-O`, check signs as chess.js writes
// them), so identical moves merge and line ids stay stable. `comment` is the cleaned PGN comment (a line label).
export interface MoveNode {
  san: string;
  comment?: string;
  children: MoveNode[];
}

// The tree starts at the standard start position: `tree` holds the possible first moves.
export type MoveTree = MoveNode[];

// The 3 openings shipped in the APK; their name follows the UI language until the player renames them.
export type EmbeddedKey = 'd4' | 'scandinavian' | 'd4Black';

export interface Opening {
  id: string;
  name: string; // the given name; empty for an embedded opening that was never renamed
  embeddedKey?: EmbeddedKey;
  color: Color;
  origin: 'embedded' | 'imported';
  tree: MoveTree;
}
