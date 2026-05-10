import { SQLiteDatabase } from 'expo-sqlite';
import { Card, CardStats } from '../../types';

export async function getOrCreateCardStats(
  db: SQLiteDatabase,
  cardId: number,
  profileId: number
): Promise<CardStats> {
  await db.runAsync(
    `INSERT OR IGNORE INTO card_stats (card_id, profile_id) VALUES (?, ?)`,
    [cardId, profileId]
  );
  const row = await db.getFirstAsync<CardStats>(
    `SELECT * FROM card_stats WHERE card_id = ? AND profile_id = ?`,
    [cardId, profileId]
  );
  return row!;
}

export async function updateCardStats(
  db: SQLiteDatabase,
  cardId: number,
  profileId: number,
  easeFactor: number,
  intervalDays: number,
  dueDate: number,
  result: 0 | 1
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `UPDATE card_stats SET
      ease_factor    = ?,
      interval_days  = ?,
      due_date       = ?,
      total_reviews  = total_reviews + 1,
      correct_count  = correct_count + ?,
      current_streak = CASE WHEN ? = 0 THEN 0 ELSE current_streak + 1 END,
      last_reviewed  = ?
    WHERE card_id = ? AND profile_id = ?`,
    [easeFactor, intervalDays, dueDate, result, result, now, cardId, profileId]
  );
}

export async function getDueCards(
  db: SQLiteDatabase,
  deckId: number,
  profileId: number
): Promise<(Card & CardStats)[]> {
  const now = Math.floor(Date.now() / 1000);
  // LEFT JOIN so cards with no stats row (never reviewed) are included —
  // a null due_date means the card has never been studied and is due immediately.
  // c.id as card_real_id is appended AFTER cs.* so it never gets overwritten by
  // cs.id (which is NULL on a LEFT JOIN miss for unreviewed cards).
  return db.getAllAsync<Card & CardStats & { card_real_id: number }>(
    `SELECT c.*, cs.*, c.id as card_real_id
     FROM cards c
     LEFT JOIN card_stats cs ON cs.card_id = c.id AND cs.profile_id = ?
     WHERE c.deck_id = ? AND (cs.due_date IS NULL OR cs.due_date <= ?)
     ORDER BY COALESCE(cs.due_date, 0) ASC`,
    [profileId, deckId, now]
  );
}

export async function getCardStatsForDeck(
  db: SQLiteDatabase,
  deckId: number,
  profileId: number
): Promise<(Card & CardStats)[]> {
  return db.getAllAsync<Card & CardStats>(
    `SELECT c.*, cs.*
     FROM cards c
     LEFT JOIN card_stats cs ON cs.card_id = c.id AND cs.profile_id = ?
     WHERE c.deck_id = ?
     ORDER BY c.created_at ASC`,
    [profileId, deckId]
  );
}
