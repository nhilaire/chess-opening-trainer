import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { importOpening, ImportError, suggestedName } from '../game/repertoire';
import type { Color, Opening } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import type { Strings } from '../i18n';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';
import { useBack } from '../ui/useBack';

type Props = { onImported: (opening: Opening) => void; onBack: () => void };

export function errorMessage(error: ImportError, t: Strings): string {
  switch (error.kind) {
    case 'empty':
      return t.import.errors.empty;
    case 'tooBig':
      return t.import.errors.tooBig;
    case 'fen':
      return t.import.errors.fen;
    case 'illegal':
      return t.import.errors.illegal(error.move);
    case 'noPlayerMove':
      return t.import.errors.noPlayerMove;
    case 'name':
      return t.import.errors.name;
  }
}

export function ImportScreen({ onImported, onBack }: Props) {
  const { t } = useI18n();
  const [pgn, setPgn] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [color, setColor] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);
  useBack(onBack);

  const changePgn = (text: string) => {
    setPgn(text);
    setError(null);
    if (!nameTouched) setName(suggestedName(text));
  };

  const submit = () => {
    if (!color) return;
    const result = importOpening(pgn, name, color, `imported-${Date.now()}`);
    if (result.ok) onImported(result.opening);
    else setError(errorMessage(result.error, t));
  };

  return (
    <Screen testID="import-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.import.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          value={pgn}
          onChangeText={changePgn}
          multiline
          placeholder={t.import.paste}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          textAlignVertical="top"
          style={[styles.input, styles.pgn]}
          accessibilityLabel={t.import.paste}
          testID="import-pgn"
          selectionColor={colors.accent}
        />
        <Text style={styles.label}>{t.import.name}</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setNameTouched(true);
            setError(null);
          }}
          maxLength={60}
          returnKeyType="done"
          style={styles.input}
          accessibilityLabel={t.import.name}
          testID="import-name"
          selectionColor={colors.accent}
        />
        <Text style={styles.label}>{t.import.color}</Text>
        <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel={t.import.color}>
          {(['white', 'black'] as const).map((c) => (
            <Pressable
              key={c}
              testID={`import-color-${c}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === c }}
              accessibilityLabel={t.color[c]}
              onPress={() => setColor(c)}
              style={[styles.choice, color === c && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, color === c && styles.choiceTextSelected]}>{t.color[c]}</Text>
            </Pressable>
          ))}
        </View>
        {error && (
          <Text style={styles.error} testID="import-error">
            {error}
          </Text>
        )}
      </ScrollView>
      <Button label={t.import.submit} onPress={submit} disabled={color === null} testID="import-submit" />
      <Button label={t.common.back} onPress={onBack} variant="secondary" testID="import-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  body: { gap: spacing.sm, paddingBottom: spacing.md },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600', marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, color: colors.text, fontSize: font.body, borderRadius: 12, padding: spacing.md },
  pgn: { minHeight: 160, maxHeight: 260, fontFamily: 'monospace', fontSize: font.small },
  colors: { flexDirection: 'row', gap: spacing.sm },
  choice: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.surface },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: font.body },
  choiceTextSelected: { color: colors.text, fontWeight: '700' },
  error: { color: colors.danger, fontSize: font.body, marginTop: spacing.sm },
});
