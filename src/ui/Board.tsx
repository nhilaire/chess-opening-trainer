// Chess board: tap a piece then a square, or drag it. Highlights the selection, its legal destinations and the
// last move; draws green arrows; flipped for Black. No chess rule here: legality comes from the engine helpers.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line, Polygon, SvgXml } from 'react-native-svg';

import { Arrow, BoardPiece, legalTargets, piecesOf, sideToMove, Square } from '../game/trainer';
import type { Color } from '../game/types';
import { isLightSquare, squareAt, squareOrigin, squaresInView } from './boardGeometry';
import { PIECE_SVGS } from './pieceSvgs';
import { board as palette } from './theme';

type Props = {
  fen: string;
  orientation: Color;
  size: number;
  lastMove?: Arrow;
  arrows?: Arrow[]; // green arrows (discovery: the move to play; after two errors: every repertoire move)
  interactive: boolean; // false while the opponent plays or when the line is over
  onMove: (from: Square, to: Square) => void;
};

const MOVE_MS = 150;

function PieceImage({ piece, cell }: { piece: Pick<BoardPiece, 'color' | 'type'>; cell: number }) {
  return <SvgXml xml={PIECE_SVGS[`${piece.color}${piece.type.toUpperCase()}`]} width={cell} height={cell} />;
}

// The piece that just moved slides from its origin square (other pieces are placed directly).
function MovedPiece({ piece, from, cell, orientation }: { piece: BoardPiece; from: Square; cell: number; orientation: Color }) {
  const target = squareOrigin(piece.square, cell, orientation);
  const origin = squareOrigin(from, cell, orientation);
  const dx = useSharedValue(origin.x - target.x);
  const dy = useSharedValue(origin.y - target.y);
  useEffect(() => {
    dx.value = withTiming(0, { duration: MOVE_MS });
    dy.value = withTiming(0, { duration: MOVE_MS });
  }, [dx, dy]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }, { translateY: dy.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={`piece-${piece.square}-${piece.color}${piece.type}`}
      style={[styles.piece, { left: target.x, top: target.y, width: cell, height: cell }, style]}
    >
      <PieceImage piece={piece} cell={cell} />
    </Animated.View>
  );
}

function ArrowShape({ arrow, cell, orientation }: { arrow: Arrow; cell: number; orientation: Color }) {
  const a = squareOrigin(arrow.from, cell, orientation);
  const b = squareOrigin(arrow.to, cell, orientation);
  const [x1, y1, x2, y2] = [a.x + cell / 2, a.y + cell / 2, b.x + cell / 2, b.y + cell / 2];
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = cell * 0.42;
  const width = cell * 0.17;
  // Shaft stops at the head's base; the head is a triangle pointing at the target centre.
  const bx = x2 - Math.cos(angle) * head;
  const by = y2 - Math.sin(angle) * head;
  const side = (sign: number) => `${bx + Math.cos(angle + (sign * Math.PI) / 2) * head * 0.55},${by + Math.sin(angle + (sign * Math.PI) / 2) * head * 0.55}`;
  return (
    <>
      <Line x1={x1} y1={y1} x2={bx} y2={by} stroke={palette.arrow} strokeWidth={width} strokeLinecap="round" opacity={0.85} />
      <Polygon points={`${x2},${y2} ${side(1)} ${side(-1)}`} fill={palette.arrow} opacity={0.85} />
    </>
  );
}

export function Board({ fen, orientation, size, lastMove, arrows = [], interactive, onMove }: Props) {
  const cell = size / 8;
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const dragRef = useRef<Square | null>(null); // read by the gesture callbacks (state may lag a render behind)
  const touchRef = useRef<Square | null>(null); // square under the finger at touch-down
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const pieces = useMemo(() => piecesOf(fen), [fen]);
  const turn = useMemo(() => sideToMove(fen), [fen]);
  const pieceAt = (square: Square) => pieces.find((p) => p.square === square);
  const ownPiece = (square: Square | null) => square !== null && pieceAt(square)?.color === turn;
  const from = dragFrom ?? selected;
  const targets = useMemo(() => (from ? legalTargets(fen, from) : []), [fen, from]);

  useEffect(() => {
    setSelected(null);
    setDragFrom(null);
    dragRef.current = null;
  }, [fen, interactive]);

  const tap = (square: Square) => {
    if (!interactive) return;
    if (selected && square !== selected && !ownPiece(square)) {
      setSelected(null);
      onMove(selected, square);
    } else if (ownPiece(square)) setSelected(square === selected ? null : square);
    else setSelected(null);
  };

  const pan = Gesture.Pan()
    .withTestId('board-pan')
    .runOnJS(true)
    .minDistance(8)
    .enabled(interactive)
    // The piece is the one touched, not the one under the finger once the 8 px threshold is crossed.
    .onBegin((e) => {
      touchRef.current = squareAt(e.x, e.y, cell, orientation);
    })
    .onStart((e) => {
      const square = touchRef.current;
      if (!ownPiece(square)) return;
      dragX.value = e.x - cell / 2;
      dragY.value = e.y - cell / 2;
      setSelected(null);
      dragRef.current = square;
      setDragFrom(square);
    })
    .onUpdate((e) => {
      dragX.value = e.x - cell / 2;
      dragY.value = e.y - cell / 2;
    })
    .onEnd((e) => {
      const start = dragRef.current;
      const to = squareAt(e.x, e.y, cell, orientation);
      if (start && to && to !== start) onMove(start, to);
    })
    .onFinalize(() => {
      touchRef.current = null;
      dragRef.current = null;
      setDragFrom(null);
    });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: 1.15 }] }));
  const dragged = dragFrom ? pieceAt(dragFrom) : undefined;

  return (
    <GestureDetector gesture={pan}>
      <View testID="board" style={{ width: size, height: size }}>
        {squaresInView(orientation).map((square, i) => {
          const light = isLightSquare(square);
          const highlighted = square === from || square === lastMove?.from || square === lastMove?.to;
          const target = targets.includes(square);
          const capture = target && pieceAt(square) !== undefined;
          const col = i % 8;
          const row = Math.floor(i / 8);
          return (
            <Pressable
              key={square}
              testID={`sq-${square}`}
              accessibilityLabel={square}
              onPress={() => tap(square)}
              style={[styles.square, { left: col * cell, top: row * cell, width: cell, height: cell, backgroundColor: light ? palette.light : palette.dark }]}
            >
              {highlighted && <View style={[StyleSheet.absoluteFill, { backgroundColor: square === from ? palette.selected : palette.lastMove }]} />}
              {target && !capture && <View style={[styles.dot, { width: cell * 0.3, height: cell * 0.3, borderRadius: cell * 0.15 }]} />}
              {capture && <View style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: cell / 2, borderWidth: cell * 0.08 }]} />}
              {col === 0 && <Text style={[styles.coord, styles.rank, { color: light ? palette.dark : palette.light, fontSize: cell * 0.2 }]}>{square[1]}</Text>}
              {row === 7 && <Text style={[styles.coord, styles.file, { color: light ? palette.dark : palette.light, fontSize: cell * 0.2 }]}>{square[0]}</Text>}
            </Pressable>
          );
        })}
        {pieces.map((piece) => {
          if (piece.square === dragFrom) return null;
          if (lastMove && piece.square === lastMove.to) {
            return <MovedPiece key={`${fen}-${piece.square}`} piece={piece} from={lastMove.from} cell={cell} orientation={orientation} />;
          }
          const { x, y } = squareOrigin(piece.square, cell, orientation);
          return (
            <View key={piece.square} pointerEvents="none" testID={`piece-${piece.square}-${piece.color}${piece.type}`} style={[styles.piece, { left: x, top: y, width: cell, height: cell }]}>
              <PieceImage piece={piece} cell={cell} />
            </View>
          );
        })}
        {arrows.map((arrow) => (
          <Svg key={`${arrow.from}-${arrow.to}`} pointerEvents="none" width={size} height={size} style={StyleSheet.absoluteFill} testID={`arrow-${arrow.from}-${arrow.to}`}>
            <ArrowShape arrow={arrow} cell={cell} orientation={orientation} />
          </Svg>
        ))}
        {dragged && (
          <Animated.View pointerEvents="none" style={[styles.piece, { left: 0, top: 0, width: cell, height: cell }, dragStyle]}>
            <PieceImage piece={dragged} cell={cell} />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  square: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
  dot: { backgroundColor: 'rgba(20, 85, 30, 0.45)' },
  ring: { borderColor: 'rgba(20, 85, 30, 0.45)' },
  coord: { position: 'absolute', fontWeight: '700' },
  rank: { top: 1, left: 2 },
  file: { bottom: 0, right: 3 },
});
