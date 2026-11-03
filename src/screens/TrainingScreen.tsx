import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { playFeedback } from '../feedback/feedback';
import { displayName } from '../game/embedded';
import { currentItem, finishLine, isOver, Outcome, QueueItem, Session, startSession } from '../game/session';
import { needsPromotion, outcome, Promotion, Prompt, reduce, Square, startLine, TrainerState } from '../game/trainer';
import type { Opening } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import type { Feedback } from '../storage/repertoireStore';
import { Board } from '../ui/Board';
import { Button } from '../ui/Button';
import { PIECE_SVGS } from '../ui/pieceSvgs';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';
import { useBack } from '../ui/useBack';

export const OPPONENT_DELAY_MS = 400;

type Props = {
  queue: QueueItem[];
  openings: Opening[];
  feedback: Feedback;
  onLineDone: (item: QueueItem, outcome: Outcome) => void;
  onExit: (session: Session) => void; // queue over, « Arrêter » or Android back
};

function lineState(item: QueueItem, openings: Opening[]): TrainerState | null {
  const opening = openings.find((o) => o.id === item.line.openingId);
  return opening ? startLine(item.line, opening.color, item.mode, opening.tree) : null;
}

export function TrainingScreen({ queue, openings, feedback, onLineDone, onExit }: Props) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [session, setSession] = useState<Session>(() => startSession(queue));
  const [trainer, setTrainer] = useState<TrainerState | null>(() => (queue[0] ? lineState(queue[0], openings) : null));
  const [lineNumber, setLineNumber] = useState(1);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  const stop = useCallback(() => onExit(session), [onExit, session]);
  useBack(stop);

  // The opponent replies after a short delay.
  useEffect(() => {
    if (trainer?.prompt !== 'opponent') return;
    const timer = setTimeout(() => setTrainer((s) => (s ? reduce(s, { type: 'opponent' }) : s)), OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trainer]);

  useEffect(() => {
    if (trainer?.sound) playFeedback(trainer.sound.kind, feedbackRef.current);
  }, [trainer?.sound]);

  // End of the line: saved at once (a later « Arrêter » keeps it).
  useEffect(() => {
    const done = trainer ? outcome(trainer) : undefined;
    if (!done || result) return;
    const item = currentItem(session);
    if (!item) return;
    setResult(done);
    onLineDone(item, done);
    setSession((s) => finishLine(s, done));
  }, [trainer, result, session, onLineDone]);

  const next = () => {
    if (isOver(session)) return onExit(session);
    const item = currentItem(session)!;
    setResult(null);
    setLineNumber((n) => n + 1);
    setTrainer(lineState(item, openings));
  };

  const play = (from: Square, to: Square, promo?: Promotion) => {
    setTrainer((s) => (s ? reduce(s, { type: 'play', from, to, promotion: promo }) : s));
  };

  const onMove = (from: Square, to: Square) => {
    if (trainer && needsPromotion(trainer.fen, from, to)) setPromotion({ from, to });
    else play(from, to);
  };

  if (!trainer) return null;
  const opening = openings.find((o) => o.id === trainer.line.openingId)!;
  const promptText = (prompt: Prompt): string => {
    if (prompt === 'opponent' || prompt === 'done') return trainer.mode === 'discover' ? t.train.discover : t.train.yourMove;
    return t.train[prompt];
  };
  const banner = result === 'learnt' ? t.train.learnt : result === 'success' ? t.train.success : result === 'failure' ? t.train.failed : null;
  const boardSize = Math.min(width - spacing.md * 2, 520);

  return (
    <Screen testID="training-screen">
      <View style={styles.header}>
        <View style={styles.headerText}>
          {trainer.line.label && (
            <Text style={styles.opening} numberOfLines={1}>
              {displayName(opening, t.openings)}
            </Text>
          )}
          <Text style={styles.label} numberOfLines={1} testID="train-label">
            {trainer.line.label ?? displayName(opening, t.openings)}
          </Text>
        </View>
        <Text style={styles.progress} testID="train-progress">
          {t.train.progress(lineNumber, session.queue.length)}
        </Text>
      </View>
      <View style={styles.boardWrap}>
        <Board
          fen={trainer.fen}
          orientation={opening.color}
          size={boardSize}
          lastMove={trainer.lastMove}
          arrow={trainer.arrow}
          interactive={trainer.prompt !== 'opponent' && trainer.prompt !== 'done' && !promotion}
          onMove={onMove}
        />
      </View>
      {promotion && (
        <View style={styles.promotion} testID="promotion-picker">
          {(['q', 'r', 'b', 'n'] as const).map((p) => (
            <Pressable
              key={p}
              testID={`promo-${p}`}
              accessibilityRole="button"
              accessibilityLabel={p.toUpperCase()}
              onPress={() => {
                play(promotion.from, promotion.to, p);
                setPromotion(null);
              }}
              style={styles.promoChoice}
            >
              <SvgXml xml={PIECE_SVGS[`${opening.color === 'white' ? 'w' : 'b'}${p.toUpperCase()}`]} width={48} height={48} />
            </Pressable>
          ))}
        </View>
      )}
      {banner ? (
        <Text style={[styles.banner, result === 'failure' ? styles.failed : styles.ok]} testID="train-banner">
          {banner}
        </Text>
      ) : (
        <Text style={[styles.prompt, (trainer.prompt === 'wrong' || trainer.prompt === 'answer') && styles.failed]} testID="train-prompt">
          {promptText(trainer.prompt)}
        </Text>
      )}
      <View style={styles.spacer} />
      {banner && <Button label={t.train.next} onPress={next} testID="train-next" />}
      <Button label={t.train.stop} onPress={stop} variant="secondary" testID="train-stop" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  opening: { color: colors.muted, fontSize: font.small },
  label: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  progress: { color: colors.muted, fontSize: font.small },
  boardWrap: { alignItems: 'center' },
  prompt: { color: colors.text, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
  banner: { fontSize: font.heading, fontWeight: '800', textAlign: 'center' },
  ok: { color: colors.success },
  failed: { color: colors.danger },
  spacer: { flex: 1 },
  promotion: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  promoChoice: { backgroundColor: '#f0d9b5', borderRadius: 10, padding: spacing.xs },
});
