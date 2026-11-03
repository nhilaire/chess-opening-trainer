import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { displayName } from '../game/embedded';
import { validateName } from '../game/pgn';
import { extractLines } from '../game/repertoire';
import { countLines, DailyNew, Progress } from '../game/scheduler';
import { buildQueue } from '../game/session';
import type { Opening } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';
import { useBack } from '../ui/useBack';

type Props = {
  opening: Opening;
  openings: Opening[];
  progress: Progress;
  daily?: DailyNew;
  today: string;
  onTrain: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onBack: () => void;
};

export function DetailScreen({ opening, openings, progress, daily, today, onTrain, onRename, onDelete, onBack }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  const name = displayName(opening, t.openings);
  const [draft, setDraft] = useState(name);
  const counts = useMemo(() => countLines(extractLines(opening), progress, today), [opening, progress, today]);
  const canTrain = useMemo(
    () => buildQueue({ openings, progress, daily, today, openingId: opening.id }).length > 0,
    [openings, progress, daily, today, opening.id],
  );
  useBack(mode === 'view' ? onBack : () => setMode('view'));

  const save = () => {
    const valid = validateName(draft);
    if (!valid) return;
    onRename(valid);
    setMode('view');
  };

  return (
    <Screen testID="detail-screen">
      <Text style={styles.title} accessibilityRole="header" testID="detail-name">
        {name}
      </Text>
      <Text style={styles.meta}>
        {t.color[opening.color]} · {t.detail.lines(counts.total)}
      </Text>
      <Text style={styles.meta}>{t.home.counts(counts.mastered, counts.due, counts.fresh)}</Text>
      <View style={styles.spacer} />
      {mode === 'view' && (
        <>
          <Button label={canTrain ? t.detail.train : t.home.nothing} onPress={onTrain} disabled={!canTrain} testID="detail-train" />
          <Button
            label={t.detail.rename}
            onPress={() => {
              setDraft(name);
              setMode('rename');
            }}
            variant="secondary"
            testID="detail-rename"
          />
          <Button label={t.detail.delete} onPress={() => setMode('delete')} variant="secondary" testID="detail-delete" />
          <Button label={t.common.back} onPress={onBack} variant="secondary" testID="detail-back" />
        </>
      )}
      {mode === 'rename' && (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            maxLength={60}
            returnKeyType="done"
            autoFocus
            style={styles.input}
            accessibilityLabel={t.import.name}
            testID="detail-name-input"
            selectionColor={colors.accent}
          />
          {validateName(draft) === null && <Text style={styles.error}>{t.import.errors.name}</Text>}
          <Button label={t.common.save} onPress={save} disabled={validateName(draft) === null} testID="detail-save" />
          <Button label={t.common.cancel} onPress={() => setMode('view')} variant="secondary" testID="detail-cancel" />
        </>
      )}
      {mode === 'delete' && (
        <>
          <Text style={styles.confirm} testID="detail-confirm-text">
            {t.detail.deleteConfirm(name)}
          </Text>
          <Button label={t.detail.delete} onPress={onDelete} variant="danger" testID="detail-confirm-delete" />
          <Button label={t.common.cancel} onPress={() => setMode('view')} variant="secondary" testID="detail-cancel" />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: font.body },
  spacer: { flex: 1 },
  input: { backgroundColor: colors.surface, color: colors.text, fontSize: font.body, borderRadius: 12, padding: spacing.md },
  error: { color: colors.danger, fontSize: font.small },
  confirm: { color: colors.text, fontSize: font.body, textAlign: 'center' },
});
