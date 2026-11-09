// What a drag gesture remembers between its callbacks: the square under the finger at touch-down and the square
// the dragged piece comes from. A plain mutable object, because React state may lag a render behind the gesture
// callbacks (the pan gesture is rebuilt on every render).
import type { Square } from '../game/trainer';

export class DragTracker {
  private touched: Square | null = null;
  private from: Square | null = null;

  // Touch-down: the piece dragged is the one touched, not the one under the finger once the threshold is crossed.
  touch(square: Square | null): void {
    this.touched = square;
  }

  touchedSquare(): Square | null {
    return this.touched;
  }

  start(square: Square | null): void {
    this.from = square;
  }

  origin(): Square | null {
    return this.from;
  }

  // A new position or a locked board ends the drag in progress; the touch-down square stays until the gesture ends.
  clearOrigin(): void {
    this.from = null;
  }

  clear(): void {
    this.touched = null;
    this.from = null;
  }
}
