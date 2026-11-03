// Board coordinates (pure): squares are laid out for the player's colour (Black: h1 top-left).
import type { Square } from '../game/trainer';
import type { Color } from '../game/types';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

// Squares row by row from the top-left corner of the screen.
export function squaresInView(orientation: Color): Square[] {
  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'white' ? FILES : [...FILES].reverse();
  return ranks.flatMap((rank) => files.map((file) => `${file}${rank}` as Square));
}

// Top-left corner of a square, in board pixels.
export function squareOrigin(square: Square, cell: number, orientation: Color): { x: number; y: number } {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]) - 1;
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return { x: col * cell, y: row * cell };
}

export function squareAt(x: number, y: number, cell: number, orientation: Color): Square | null {
  const col = Math.floor(x / cell);
  const row = Math.floor(y / cell);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return squaresInView(orientation)[row * 8 + col];
}

export function isLightSquare(square: Square): boolean {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]) - 1;
  return (file + rank) % 2 === 1;
}
