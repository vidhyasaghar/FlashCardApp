import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { useProfileStore } from '../../src/stores/profileStore';
import { getDatabase } from '../../src/db/database';
import { getDeckById } from '../../src/db/queries/decks';
import { getCardsByDeck, deleteCard } from '../../src/db/queries/cards';
import { getDueCards, getCardStatsForDeck } from '../../src/db/queries/cardStats';
import { Deck, Card as FlashCard } from '../../src/types';

export default function DeckDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeProfile } = useProfileStore();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [mastery, setMastery] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCards, setShowCards] = useState(false);

  const deckId = parseInt(id ?? '0', 10);

  const load = useCallback(async () => {
    if (!activeProfile || !deckId) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const [d, c, due, statsRows] = await Promise.all([
        getDeckById(db, deckId),
        getCardsByDeck(db, deckId),
        getDueCards(db, deckId, activeProfile.id),
        getCardStatsForDeck(db, deckId, activeProfile.id),
      ]);
      const totalReviews = statsRows.reduce((s, r) => s + (r.total_reviews ?? 0), 0);
      const totalCorrect = statsRows.reduce((s, r) => s + (r.correct_count ?? 0), 0);
      setDeck(d);
      setCards(c);
      setDueCount(due.length);
      setMastery(totalReviews > 0 ? totalCorrect / totalReviews : 0);
    } finally {
      setLoading(false);
    }
  }, [deckId, activeProfile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDeleteCard = (card: FlashCard) => {
    Alert.alert('Delete card?', `"${card.front}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await deleteCard(db, card.id);
          setCards(prev => prev.filter(c => c.id !== card.id));
        },
      },
    ]);
  };

  const s = styles(theme);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 24 }} />
        </View>
        <View style={s.center}><ActivityIndicator color={theme.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!deck) {
    return (
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>Deck not found</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{deck.title}</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="create-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.heroTitle, { color: theme.text }]}>{deck.title}</Text>
        {deck.description ? (
          <Text style={[s.heroDesc, { color: theme.textSecondary }]}>{deck.description}</Text>
        ) : null}

        {/* Stat boxes */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <Text style={[s.statNum, { color: theme.accent }]}>{cards.length}</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>cards</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <Text style={[s.statNum, { color: theme.accent }]}>{Math.round(mastery * 100)}%</Text>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>mastery</Text>
          </View>
        </View>

        {/* Mastery progress */}
        <ProgressBar progress={mastery} height={4} />

        {/* Study button — enabled only when cards are due */}
        <TouchableOpacity
          style={[
            s.studyBtn,
            {
              backgroundColor: dueCount > 0 ? theme.accent : theme.surfaceRaised,
              borderColor: dueCount > 0 ? theme.accent : theme.border,
              opacity: dueCount > 0 ? 1 : 0.4,
            },
          ]}
          onPress={() => dueCount > 0 && router.push(`/study/${deck.id}`)}
          activeOpacity={dueCount > 0 ? 0.8 : 1}
          disabled={dueCount === 0}
        >
          <Text style={[s.studyBtnText, { color: dueCount > 0 ? '#fff' : theme.textSecondary }]}>
            {dueCount > 0 ? `Study now · ${dueCount} due` : 'All caught up ✓'}
          </Text>
        </TouchableOpacity>

        {/* Browse / Add */}
        <TouchableOpacity
          style={[s.secondaryBtn, { backgroundColor: theme.accentLight }]}
          onPress={() => setShowCards(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={[s.secondaryBtnText, { color: theme.accentText }]}>
            {showCards ? 'Hide cards' : 'Show cards'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.ghostBtn}
          onPress={() => router.push(`/card/create?deckId=${deck.id}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.textSecondary} />
          <Text style={[s.ghostBtnText, { color: theme.textSecondary }]}>Add cards</Text>
        </TouchableOpacity>

        {/* Expandable card list */}
        {showCards && (
          <View style={[s.cardList, { borderColor: theme.border }]}>
            {cards.length === 0 ? (
              <Text style={[s.noCards, { color: theme.textSecondary }]}>No cards yet.</Text>
            ) : (
              cards.map((card, i) => (
                <View
                  key={card.id}
                  style={[
                    s.cardRow,
                    i < cards.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={s.cardTexts}>
                    <Text style={[s.cardFront, { color: theme.text }]} numberOfLines={2}>{card.front}</Text>
                    <Text style={[s.cardBack, { color: theme.textSecondary }]} numberOfLines={1}>{card.back}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(card)}
                    style={s.trashBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
  heroTitle: { ...Typography.h1 },
  heroDesc: { ...Typography.body },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 0.5,
  },
  statNum: { ...Typography.h2 },
  statLabel: { ...Typography.bodySmall, marginTop: 4 },
  studyBtn: {
    height: 52, borderRadius: Radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  studyBtnText: { ...Typography.h3 },
  secondaryBtn: {
    height: 52, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { ...Typography.h3 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, height: 44,
  },
  ghostBtnText: { ...Typography.body },
  cardList: {
    borderRadius: Radius.lg, borderWidth: 0.5, overflow: 'hidden',
  },
  noCards: { ...Typography.body, textAlign: 'center', padding: Spacing.md },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
  },
  cardTexts: { flex: 1, gap: 2 },
  cardFront: { ...Typography.body },
  cardBack: { ...Typography.bodySmall },
  trashBtn: { paddingHorizontal: 8 },
});
