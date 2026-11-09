import { DragTracker } from '../ui/dragTracker';

describe('DragTracker', () => {
  it('remembers the touched square and the drag origin until the gesture ends', () => {
    const drag = new DragTracker();
    expect(drag.touchedSquare()).toBeNull();
    expect(drag.origin()).toBeNull();
    drag.touch('e2');
    drag.start('e2');
    expect(drag.touchedSquare()).toBe('e2');
    expect(drag.origin()).toBe('e2');
    drag.clear();
    expect(drag.touchedSquare()).toBeNull();
    expect(drag.origin()).toBeNull();
  });

  it('clearOrigin ends the drag but keeps the touch-down square', () => {
    const drag = new DragTracker();
    drag.touch('g1');
    drag.start('g1');
    drag.clearOrigin();
    expect(drag.origin()).toBeNull();
    expect(drag.touchedSquare()).toBe('g1');
  });
});
