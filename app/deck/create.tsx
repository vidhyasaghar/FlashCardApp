import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { useProfileStore } from '../../src/stores/profileStore';
import { getDatabase } from '../../src/db/database';
import { createDeck } from '../../src/db/queries/decks';
import { Deck } from '../../src/types';

type Direction = 'front_to_back' | 'back_to_front';
const DIRECTION_OPTIONS: { label: string; value: Direction }[] = [
  { label: 'Front → Back', value: 'front_to_back' },
  { label: 'Back → Front', value: 'back_to_front' },
];

export default function CreateDeckScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeProfile } = useProfileStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState<Direction>('front_to_back');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!activeProfile) { setError('No active profile'); return; }
    setLoading(true);
    try {
      const db = await getDatabase();
      const deck: Deck = await createDeck(db, activeProfile.id, title.trim(), description.trim() || undefined, direction);
      router.push(`/card/create?deckId=${deck.id}`);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  return (
    <View style={[s.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>New deck</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <Text style={[s.label, { color: theme.textSecondary }]}>TITLE</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Spanish Vocabulary"
          placeholderTextColor={theme.textTertiary}
          value={title}
          onChangeText={t => { setTitle(t); setError(''); }}
          autoFocus
          returnKeyType="next"
        />

        <Text style={[s.label, { color: theme.textSecondary }]}>DESCRIPTION (optional)</Text>
        <TextInput
          style={[s.input, s.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="What is this deck for?"
          placeholderTextColor={theme.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={[s.label, { color: theme.textSecondary }]}>STUDY DIRECTION</Text>
        <View style={[s.segmented, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {DIRECTION_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.segment,
                direction === opt.value && { backgroundColor: theme.accent },
              ]}
              onPress={() => setDirection(opt.value)}
            >
              <Text style={[
                s.segmentLabel,
                { color: direction === opt.value ? '#fff' : theme.textSecondary },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={[s.error, { color: theme.danger }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button label="Create deck" onPress={handleCreate} loading={loading} />
      </View>
    </View>
  );
}

const styles = (theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3 },
  form: { padding: Spacing.lg, gap: Spacing.xs, paddingBottom: 40 },
  label: { ...Typography.label, textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: {
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body,
  },
  textArea: { minHeight: 80 },
  segmented: {
    flexDirection: 'row', borderRadius: Radius.md, borderWidth: 1,
    overflow: 'hidden', padding: 3,
  },
  segment: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: Radius.sm,
  },
  segmentLabel: { ...Typography.bodySmall, fontWeight: '600' },
  error: { ...Typography.bodySmall, marginTop: Spacing.sm },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
});
