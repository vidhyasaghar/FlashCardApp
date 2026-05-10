import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { useProfileStore } from '../../src/stores/profileStore';
import { getDatabase } from '../../src/db/database';
import { getDecksByProfile } from '../../src/db/queries/decks';
import { getCardsByDeck } from '../../src/db/queries/cards';
import { getCardStatsForDeck, getDueCards } from '../../src/db/queries/cardStats';
import { Deck } from '../../src/types';

interface DeckRow {
  deck: Deck;
  cardCount: number;
  dueCount: number;
  mastery: number;
}

export default function DecksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const [rows, setRows] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDue, setTotalDue] = useState(0);

  const load = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const decks = await getDecksByProfile(db, activeProfile.id);
      let due = 0;
      const built: DeckRow[] = await Promise.all(
        decks.map(async deck => {
          const [cards, statsRows, dueCards] = await Promise.all([
            getCardsByDeck(db, deck.id),
            getCardStatsForDeck(db, deck.id, activeProfile.id),
            getDueCards(db, deck.id, activeProfile.id),
          ]);
          console.log(`[decks] "${deck.title}" — total: ${cards.length}, due: ${dueCards.length}`);
          const totalReviews = statsRows.reduce((s, r) => s + (r.total_reviews ?? 0), 0);
          const totalCorrect = statsRows.reduce((s, r) => s + (r.correct_count ?? 0), 0);
          const mastery = totalReviews > 0 ? totalCorrect / totalReviews : 0;
          due += dueCards.length;
          return { deck, cardCount: cards.length, dueCount: dueCards.length, mastery };
        })
      );
      setRows(built);
      setTotalDue(due);
      console.log(`[decks] totalDue=${due}`);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const s = styles(theme);

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={[s.avatar, { backgroundColor: theme.accent }]}>
            <Text style={s.avatarLetter}>{activeProfile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={[s.profileName, { color: theme.text }]}>{activeProfile?.name ?? 'No profile'}</Text>
        </View>
        <TouchableOpacity onPress={() => {}} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Due today pill */}
      {!loading && totalDue > 0 && (
        <View style={s.pillRow}>
          <View style={[s.duePill, { backgroundColor: theme.accent }]}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={s.duePillText}>{totalDue} card{totalDue !== 1 ? 's' : ''} due</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : rows.length === 0 ? (
        /* Empty state */
        <View style={s.center}>
          <View style={[s.emptyBox, { backgroundColor: theme.accentLight }]}>
            <Ionicons name="add" size={48} color={theme.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.text }]}>No decks yet</Text>
          <Text style={[s.emptyHint, { color: theme.textSecondary }]}>Tap + to create your first deck</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {rows.map(({ deck, cardCount, dueCount, mastery }) => (
            <TouchableOpacity
              key={deck.id}
              onPress={() => router.push(`/deck/${deck.id}`)}
              activeOpacity={0.75}
            >
              <View style={[s.deckCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Absolute due badge */}
                {dueCount > 0 && (
                  <View style={[s.dueBadge, { backgroundColor: theme.accent }]}>
                    <Text style={s.dueBadgeText}>{dueCount}</Text>
                  </View>
                )}
                <Text style={[s.deckTitle, { color: theme.text, paddingRight: dueCount > 0 ? 44 : 0 }]} numberOfLines={1}>
                  {deck.title}
                </Text>
                {deck.description ? (
                  <Text style={[s.deckDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                    {deck.description}
                  </Text>
                ) : null}
                <View style={s.metaRow}>
                  <Text style={[s.metaText, { color: theme.textSecondary }]}>
                    {cardCount} card{cardCount !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[s.metaText, { color: theme.textSecondary }]}>
                    {Math.round(mastery * 100)}% mastery
                  </Text>
                </View>
                <ProgressBar progress={mastery} height={5} style={s.progressBar} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/deck/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = (theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { ...Typography.h3, color: '#fff' },
  profileName: { ...Typography.h3 },
  pillRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  duePill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
  },
  duePillText: { ...Typography.label, color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyBox: {
    width: 120, height: 120, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  emptyTitle: { ...Typography.h3 },
  emptyHint: { ...Typography.body, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  deckCard: {
    borderRadius: Radius.lg, borderWidth: 0.5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 4,
    gap: Spacing.xs, position: 'relative',
    elevation: 3, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
  },
  dueBadge: {
    position: 'absolute', top: 12, right: 12,
    minWidth: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  dueBadgeText: { ...Typography.label, color: '#fff', fontSize: 12 },
  deckTitle: { ...Typography.h3 },
  deckDesc: { ...Typography.bodySmall, marginTop: 2, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  metaText: { ...Typography.bodySmall },
  progressBar: { marginTop: Spacing.xs },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
});
