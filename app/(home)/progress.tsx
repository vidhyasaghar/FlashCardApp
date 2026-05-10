import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme, Typography, Spacing, Radius, Colors } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { useProfileStore } from '../../src/stores/profileStore';
import { getDatabase } from '../../src/db/database';
import { getDecksByProfile } from '../../src/db/queries/decks';
import { getCardStatsForDeck } from '../../src/db/queries/cardStats';

interface DayBar { label: string; count: number; isToday: boolean; }
interface DeckMastery { title: string; mastery: number; }

function computeStreak(reviewDays: Set<string>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (reviewDays.has(key)) { streak++; }
    else if (i > 0) { break; }
  }
  return streak;
}

export default function ProgressScreen() {
  const theme = useTheme();
  const { activeProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [weekBars, setWeekBars] = useState<DayBar[]>([]);
  const [deckMasteries, setDeckMasteries] = useState<DeckMastery[]>([]);

  const load = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const db = await getDatabase();
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
      const rows = await db.getAllAsync<{ review_date: string; count: number }>(
        `SELECT date(reviewed_at, 'unixepoch') as review_date, COUNT(*) as count
         FROM review_log WHERE profile_id = ? AND reviewed_at >= ?
         GROUP BY review_date`,
        [activeProfile.id, sevenDaysAgo]
      );
      const countByDay: Record<string, number> = {};
      for (const r of rows) { countByDay[r.review_date] = r.count; }

      const allDays = await db.getAllAsync<{ review_date: string }>(
        `SELECT DISTINCT date(reviewed_at, 'unixepoch') as review_date
         FROM review_log WHERE profile_id = ?`,
        [activeProfile.id]
      );
      setStreak(computeStreak(new Set(allDays.map(r => r.review_date))));

      const today = new Date();
      const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const bars: DayBar[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        bars.push({ label: DAY_LABELS[d.getDay()], count: countByDay[key] ?? 0, isToday: i === 0 });
      }
      setWeekBars(bars);

      const decks = await getDecksByProfile(db, activeProfile.id);
      const masteries: DeckMastery[] = await Promise.all(
        decks.map(async deck => {
          const s = await getCardStatsForDeck(db, deck.id, activeProfile.id);
          const rev = s.reduce((a, r) => a + (r.total_reviews ?? 0), 0);
          const cor = s.reduce((a, r) => a + (r.correct_count ?? 0), 0);
          return { title: deck.title, mastery: rev > 0 ? cor / rev : 0 };
        })
      );
      setDeckMasteries(masteries);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxCount = Math.max(1, ...weekBars.map(b => b.count));
  const s = styles(theme);

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Progress</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Streak card */}
          <Card style={s.streakCard}>
            <Text style={s.fire}>🔥</Text>
            <Text style={[s.streakNum, { color: theme.accent }]}>{streak}</Text>
            <Text style={[s.streakSub, { color: theme.textSecondary }]}>day streak</Text>
            <Text style={[s.streakMotivation, { color: theme.textTertiary }]}>
              {streak > 0 ? 'Keep it up! 🔥' : 'Study every day to keep your streak'}
            </Text>
          </Card>

          {/* Weekly chart */}
          <Text style={[s.sectionTitle, { color: theme.text }]}>This week</Text>
          <Card style={s.chartCard} padded={false}>
            <View style={s.barsRow}>
              {weekBars.map((bar, i) => {
                const fillPct = bar.count > 0 ? (bar.count / maxCount) * 100 : 0;
                return (
                  <View key={i} style={s.barCol}>
                    {/* Count above bar — today always shown, others only if > 0 */}
                    <Text style={[s.barCount, { color: bar.isToday ? theme.accent : theme.textTertiary, marginBottom: 4 }]}>
                      {(bar.isToday || bar.count > 0) ? bar.count : ''}
                    </Text>
                    <View style={s.barTrack}>
                      {fillPct > 0 && (
                        <View
                          style={[
                            s.barFill,
                            {
                              height: `${fillPct}%` as any,
                              backgroundColor: bar.isToday ? theme.accent : theme.borderStrong,
                            },
                          ]}
                        />
                      )}
                      <View style={[s.barNub, { backgroundColor: bar.isToday ? theme.accent : theme.borderStrong }]} />
                    </View>
                    <Text style={[
                      s.dayLabel,
                      { color: bar.isToday ? theme.accent : theme.textSecondary,
                        fontWeight: bar.isToday ? '700' : '400' },
                    ]}>
                      {bar.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Deck mastery */}
          {deckMasteries.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: theme.text }]}>Deck mastery</Text>
              <Card padded={false}>
                {deckMasteries.map((dm, i) => (
                  <View
                    key={i}
                    style={[
                      s.masteryRow,
                      i < deckMasteries.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={s.masteryTop}>
                      <Text style={[s.masteryTitle, { color: theme.text }]} numberOfLines={1}>{dm.title}</Text>
                      <Text style={[s.masteryPct, { color: theme.accent }]}>
                        {Math.round(dm.mastery * 100)}%
                      </Text>
                    </View>
                    <ProgressBar progress={dm.mastery} height={6} />
                  </View>
                ))}
              </Card>
            </>
          )}

          {deckMasteries.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, { color: theme.textSecondary }]}>
                Start studying to see your progress here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = (theme: typeof Colors.light) => StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { ...Typography.h1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  streakCard: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.xs },
  fire: { fontSize: 40 },
  streakNum: { fontSize: 48, fontWeight: '700', lineHeight: 56 },
  streakSub: { ...Typography.bodySmall },
  streakMotivation: { ...Typography.bodySmall, marginTop: Spacing.xs },
  sectionTitle: { ...Typography.h3, marginTop: Spacing.sm },
  chartCard: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', gap: 0 },
  barFill: { width: '100%', borderRadius: Radius.sm },
  barNub: { width: '100%', height: 6, borderRadius: Radius.sm },
  barCount: { ...Typography.label, fontSize: 10 },
  dayLabel: { ...Typography.label },
  masteryRow: { paddingVertical: 14, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  masteryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  masteryTitle: { ...Typography.body, flex: 1 },
  masteryPct: { ...Typography.body, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.xl },
  emptyText: { ...Typography.body, textAlign: 'center' },
});
