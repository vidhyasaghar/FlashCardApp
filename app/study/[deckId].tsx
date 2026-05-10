import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { useProfileStore } from '../../src/stores/profileStore';
import { getDatabase } from '../../src/db/database';
import { getDeckById } from '../../src/db/queries/decks';
import { getOrCreateCardStats, updateCardStats, getDueCards } from '../../src/db/queries/cardStats';
import { insertReviewLog } from '../../src/db/queries/reviewLog';
import { calculateSM2 } from '../../src/engine/sm2';
import { Card as FlashCard, CardStats, Deck } from '../../src/types';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = SW - 32;
const CARD_HEIGHT = 260;

type DueCard = FlashCard & Partial<CardStats> & { card_id?: number; card_real_id: number };

interface Summary { total: number; correct: number; again: number; }

export default function StudyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const deckIdNum = parseInt(deckId ?? '0', 10);
  const { activeProfile } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<DueCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAgain, setSessionAgain] = useState(0);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.45, 0.5], outputRange: [1, 1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0.5, 0.55, 1], outputRange: [0, 1, 1] });

  useEffect(() => {
    (async () => {
      if (!activeProfile) return;
      const db = await getDatabase();
      const [d, due] = await Promise.all([
        getDeckById(db, deckIdNum),
        getDueCards(db, deckIdNum, activeProfile.id),
      ]);
      setDeck(d);
      setQueue(due as DueCard[]);
      setLoading(false);
    })();
  }, [deckIdNum, activeProfile]);

  const flipCard = () => {
    if (isFlipped) return;
    Animated.timing(flipAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
      setIsFlipped(true);
      setTimeout(() => setRatingVisible(true), 300);
    });
  };

  const handleRate = async (result: 0 | 1) => {
    if (!activeProfile) return;
    const card = queue[idx];
    const db = await getDatabase();

    // card_real_id is c.id aliased after cs.* so it's never overwritten by a null cs.id
    const cardId = card.card_real_id;
    const stats: CardStats = await getOrCreateCardStats(db, cardId, activeProfile.id);
    const { newEaseFactor, newIntervalDays, newDueDate } = calculateSM2(
      stats.ease_factor, stats.interval_days, result
    );
    await updateCardStats(db, cardId, activeProfile.id, newEaseFactor, newIntervalDays, newDueDate, result);
    await insertReviewLog(db, cardId, activeProfile.id, result, stats.interval_days, newIntervalDays);

    const newCorrect = sessionCorrect + (result === 1 ? 1 : 0);
    const newAgain = sessionAgain + (result === 0 ? 1 : 0);

    if (idx + 1 >= queue.length) {
      setSummary({ total: queue.length, correct: newCorrect, again: newAgain });
      return;
    }
    setSessionCorrect(newCorrect);
    setSessionAgain(newAgain);

    // Slide + fade out current card
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setIdx(i => i + 1);
      setIsFlipped(false);
      setRatingVisible(false);
      flipAnim.setValue(0);
      slideAnim.setValue(400);
      cardOpacity.setValue(0);

      // Slide + fade in next card
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const resetAndStudyAgain = async () => {
    if (!activeProfile) return;
    setSummary(null);
    setIdx(0);
    setSessionCorrect(0);
    setSessionAgain(0);
    setIsFlipped(false);
    setRatingVisible(false);
    flipAnim.setValue(0);
    slideAnim.setValue(0);
    cardOpacity.setValue(1);
    setLoading(true);
    const db = await getDatabase();
    const due = await getDueCards(db, deckIdNum, activeProfile.id);
    setQueue(due as DueCard[]);
    setLoading(false);
  };

  const s = styles(theme);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={s.center}><ActivityIndicator color={theme.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  // ── All caught up ─────────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>{deck?.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={[s.caughtUpTitle, { color: theme.text }]}>All caught up!</Text>
          <Text style={[s.caughtUpSub, { color: theme.textSecondary }]}>No cards due right now.</Text>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: theme.accent, marginTop: Spacing.lg }]}
            onPress={() => router.back()}
          >
            <Text style={s.primaryBtnText}>Back to deck</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Session summary ───────────────────────────────────────────────────────────
  if (summary) {
    const score = summary.total > 0 ? summary.correct / summary.total : 0;
    const msg = score >= 0.8 ? 'Excellent session!' : score >= 0.6 ? 'Good progress!' : 'Keep practicing!';
    return (
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
        <View style={s.header}>
          <View style={{ width: 24 }} />
          <Text style={[s.headerTitle, { color: theme.text }]}>Session complete</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[s.center, { paddingHorizontal: Spacing.lg, gap: 20, paddingTop: 60 }]}>
          {/* Checkmark circle */}
          <View style={[s.checkCircle, { backgroundColor: theme.successLight }]}>
            <Text style={[s.checkMark, { color: theme.success }]}>✓</Text>
          </View>
          <Text style={[s.summaryTitle, { color: theme.text }]}>Session complete!</Text>
          <Text style={[s.summarySubtitle, { color: theme.textSecondary }]}>
            {summary.total} card{summary.total !== 1 ? 's' : ''} studied
          </Text>

          {/* Three stat boxes */}
          <View style={s.statRow}>
            <View style={[s.summaryStatBox, { backgroundColor: theme.successLight }]}>
              <Text style={[s.summaryStatNum, { color: theme.success }]}>{summary.correct}</Text>
              <Text style={[s.summaryStatLabel, { color: theme.success }]}>Got it</Text>
            </View>
            <View style={[s.summaryStatBox, { backgroundColor: theme.dangerLight }]}>
              <Text style={[s.summaryStatNum, { color: theme.danger }]}>{summary.again}</Text>
              <Text style={[s.summaryStatLabel, { color: theme.danger }]}>Again</Text>
            </View>
            <View style={[s.summaryStatBox, { backgroundColor: theme.accentLight }]}>
              <Text style={[s.summaryStatNum, { color: theme.accent }]}>{Math.round(score * 100)}%</Text>
              <Text style={[s.summaryStatLabel, { color: theme.accent }]}>Score</Text>
            </View>
          </View>

          <Text style={[s.summaryMsg, { color: theme.textSecondary }]}>{msg}</Text>

          <View style={s.summaryActions}>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
              <Text style={s.primaryBtnText}>Back to deck</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: theme.accentLight }]} onPress={resetAndStudyAgain}>
              <Text style={[s.secondaryBtnText, { color: theme.accentText }]}>Study again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active study card ─────────────────────────────────────────────────────────
  const card = queue[idx];
  const showFront = deck?.card_direction !== 'back_to_front';
  const primaryText = showFront ? card.front : card.back;
  const secondaryText = showFront ? card.back : card.front;

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{deck?.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <ProgressBar progress={idx / queue.length} animated={false} height={4} />
        <Text style={[s.progressLabel, { color: theme.textSecondary }]}>{idx + 1} / {queue.length}</Text>
      </View>

      {/* Card area */}
      <View style={s.cardArea}>
        <Animated.View
          style={[
            s.cardContainer,
            { transform: [{ translateX: slideAnim }], opacity: cardOpacity },
          ]}
        >
          {/* Front face */}
          <Animated.View
            style={[
              s.face,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.cardShadow,
                transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
                opacity: frontOpacity,
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <Text style={[s.faceLabel, { color: theme.textTertiary }]}>QUESTION</Text>
            <Text style={[s.faceText, { color: theme.text }]}>{primaryText}</Text>
            <Text style={[s.tapHint, { color: theme.textTertiary }]}>Tap to flip →</Text>
          </Animated.View>

          {/* Back face */}
          <Animated.View
            style={[
              s.face,
              {
                backgroundColor: theme.surfaceRaised,
                borderColor: theme.accent,
                shadowColor: theme.cardShadow,
                transform: [{ perspective: 1200 }, { rotateY: backRotate }],
                opacity: backOpacity,
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <Text style={[s.faceLabel, { color: theme.accent }]}>ANSWER</Text>
            <Text style={[s.faceText, { color: theme.accent }]}>{secondaryText}</Text>
          </Animated.View>

          {/* Tap target (front side only) */}
          {!isFlipped && (
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={flipCard} activeOpacity={0.9} />
          )}
        </Animated.View>
      </View>

      {/* Rating buttons — appear 300ms after flip completes */}
      {isFlipped && ratingVisible && (
        <View style={[s.ratingWrap, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
          <TouchableOpacity
            style={[s.ratingBtn, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}
            onPress={() => handleRate(0)}
            activeOpacity={0.8}
          >
            <Text style={[s.ratingText, { color: theme.danger }]}>✗  Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ratingBtn, { backgroundColor: theme.successLight, borderColor: theme.success }]}
            onPress={() => handleRate(1)}
            activeOpacity={0.8}
          >
            <Text style={[s.ratingText, { color: theme.success }]}>✓  Got it</Text>
          </TouchableOpacity>
        </View>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  progressWrap: { paddingHorizontal: Spacing.lg, gap: Spacing.xs, marginBottom: Spacing.md },
  progressLabel: { ...Typography.bodySmall, textAlign: 'right' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardContainer: { width: CARD_WIDTH, height: CARD_HEIGHT },
  face: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: Radius.xl, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
    elevation: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10,
  },
  faceLabel: { ...Typography.label, position: 'absolute', top: Spacing.lg },
  faceText: { ...Typography.h2, textAlign: 'center' },
  tapHint: { ...Typography.bodySmall, position: 'absolute', bottom: Spacing.lg },
  ratingWrap: { paddingHorizontal: 16, paddingTop: Spacing.md, gap: 12 },
  ratingBtn: {
    height: 56, borderRadius: Radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingText: { ...Typography.h3 },
  // Caught up
  caughtUpTitle: { ...Typography.h1, textAlign: 'center' },
  caughtUpSub: { ...Typography.body, textAlign: 'center' },
  // Summary
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 36, fontWeight: '700' },
  summaryTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  summarySubtitle: { ...Typography.body, textAlign: 'center', marginTop: -Spacing.sm },
  statRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  summaryStatBox: {
    flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md,
    alignItems: 'center', gap: Spacing.xs,
  },
  summaryStatNum: { ...Typography.h2 },
  summaryStatLabel: { ...Typography.label },
  summaryMsg: { ...Typography.body, textAlign: 'center' },
  summaryActions: { width: '100%', gap: Spacing.sm },
  primaryBtn: {
    width: '100%', height: 52, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { ...Typography.h3, color: '#fff' },
  secondaryBtn: {
    width: '100%', height: 52, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { ...Typography.h3 },
});
