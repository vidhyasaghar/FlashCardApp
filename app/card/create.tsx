import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { getDatabase } from '../../src/db/database';
import { createCard } from '../../src/db/queries/cards';
import { Card as FlashCard } from '../../src/types';

export default function CreateCardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const deckIdNum = parseInt(deckId ?? '0', 10);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [added, setAdded] = useState<FlashCard[]>([]);
  const [error, setError] = useState('');
  const frontRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => frontRef.current?.focus(), 200);
  }, []);

  const handleAdd = async () => {
    setError('');
    if (!front.trim()) { setError('Front text is required'); return; }
    if (!back.trim()) { setError('Back text is required'); return; }
    const db = await getDatabase();
    const card = await createCard(db, deckIdNum, front.trim(), back.trim());
    setAdded(prev => [card, ...prev]);
    setFront('');
    setBack('');
    setTimeout(() => frontRef.current?.focus(), 50);
  };

  const s = styles(theme);
  const recent = added.slice(0, 3);

  return (
    <View style={[s.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Add cards</Text>
          {added.length > 0 && (
            <View style={[s.countBadge, { backgroundColor: theme.accent }]}>
              <Text style={s.countText}>{added.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[s.doneBtn, { color: theme.accent }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>FRONT</Text>
        <TextInput
          ref={frontRef}
          style={[s.inputBox, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Question or term"
          placeholderTextColor={theme.textTertiary}
          value={front}
          onChangeText={t => { setFront(t); setError(''); }}
          multiline
          returnKeyType="next"
          blurOnSubmit={false}
        />

        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>BACK</Text>
        <TextInput
          style={[s.inputBox, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Answer or definition"
          placeholderTextColor={theme.textTertiary}
          value={back}
          onChangeText={t => { setBack(t); setError(''); }}
          multiline
        />

        {error ? <Text style={[s.error, { color: theme.danger }]}>{error}</Text> : null}

        <Button label="Add card" onPress={handleAdd} style={s.addBtn} />

        {recent.length > 0 && (
          <>
            <Text style={[s.recentLabel, { color: theme.textSecondary }]}>Recently added</Text>
            {recent.map(card => (
              <View
                key={card.id}
                style={[s.previewRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[s.previewFront, { color: theme.text }]} numberOfLines={1}>{card.front}</Text>
                <Ionicons name="swap-horizontal" size={14} color={theme.textTertiary} />
                <Text style={[s.previewBack, { color: theme.textSecondary }]} numberOfLines={1}>{card.back}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { ...Typography.h3 },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xs,
  },
  countText: { ...Typography.label, color: '#fff' },
  doneBtn: { ...Typography.h3 },
  scroll: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 40 },
  fieldLabel: { ...Typography.label, textTransform: 'uppercase' },
  inputBox: {
    minHeight: 80, borderRadius: Radius.md, borderWidth: 1,
    padding: Spacing.md, ...Typography.body, textAlignVertical: 'top',
  },
  error: { ...Typography.bodySmall },
  addBtn: { marginTop: Spacing.sm },
  recentLabel: { ...Typography.label, textTransform: 'uppercase', marginTop: Spacing.md },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 0.5,
  },
  previewFront: { ...Typography.bodySmall, flex: 1 },
  previewBack: { ...Typography.bodySmall, flex: 1, textAlign: 'right' },
});
