import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chess } from 'chess.js';

import { Board } from '../ui/Board';
import { squareAt, squareOrigin, squaresInView } from '../ui/boardGeometry';

const START = new Chess().fen();

describe('board geometry (AC-21)', () => {
  it('shows a8 top-left for White and h1 top-left for Black', () => {
    expect(squaresInView('white')[0]).toBe('a8');
    expect(squaresInView('white')[63]).toBe('h1');
    expect(squaresInView('black')[0]).toBe('h1');
    expect(squaresInView('black')[63]).toBe('a8');
  });

  it('maps squares to pixels and back in both orientations', () => {
    expect(squareOrigin('e2', 40, 'white')).toEqual({ x: 160, y: 240 });
    expect(squareOrigin('e2', 40, 'black')).toEqual({ x: 120, y: 40 });
    expect(squareAt(165, 245, 40, 'white')).toBe('e2');
    expect(squareAt(125, 45, 40, 'black')).toBe('e2');
    expect(squareAt(-1, 10, 40, 'white')).toBeNull();
    expect(squareAt(10, 330, 40, 'white')).toBeNull();
  });
});

describe('Board (tap-tap)', () => {
  it('moves a piece by tapping it then a destination', async () => {
    const onMove = jest.fn();
    await render(<Board fen={START} orientation="white" size={320} interactive onMove={onMove} />);
    await fireEvent.press(screen.getByTestId('sq-e2'));
    await fireEvent.press(screen.getByTestId('sq-e4'));
    expect(onMove).toHaveBeenCalledWith('e2', 'e4');
  });

  it('passes any destination to the engine (which decides), and ignores empty or enemy squares first', async () => {
    const onMove = jest.fn();
    await render(<Board fen={START} orientation="white" size={320} interactive onMove={onMove} />);
    await fireEvent.press(screen.getByTestId('sq-e4')); // empty
    await fireEvent.press(screen.getByTestId('sq-e7')); // opponent's piece
    expect(onMove).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('sq-g1'));
    await fireEvent.press(screen.getByTestId('sq-b1')); // another own piece: selection changes
    await fireEvent.press(screen.getByTestId('sq-c3'));
    expect(onMove).toHaveBeenCalledWith('b1', 'c3');
  });

  it('does nothing when not interactive', async () => {
    const onMove = jest.fn();
    await render(<Board fen={START} orientation="white" size={320} interactive={false} onMove={onMove} />);
    await fireEvent.press(screen.getByTestId('sq-e2'));
    await fireEvent.press(screen.getByTestId('sq-e4'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('draws the pieces and the arrow', async () => {
    await render(<Board fen={START} orientation="black" size={320} interactive onMove={jest.fn()} arrows={[{ from: 'd2', to: 'd4' }, { from: 'c2', to: 'c4' }]} />);
    expect(screen.getByTestId('piece-e1-wk')).toBeTruthy();
    expect(screen.getByTestId('piece-d8-bq')).toBeTruthy();
    expect(screen.getByTestId('arrow-d2-d4')).toBeTruthy();
    expect(screen.getByTestId('arrow-c2-c4')).toBeTruthy();
  });
});
