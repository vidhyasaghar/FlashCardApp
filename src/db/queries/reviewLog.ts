import { SQLiteDatabase } from 'expo-sqlite';
import { ReviewLog } from '../../types';

export async function insertReviewLog(
  db: SQLiteDatabase,
  cardId: number,
  profileId: number,
  result: 0 | 1,
  intervalBefore: number,
  intervalAfter: number
): Promise<void> {
  await db.runAsync(
    `INSERT INTO review_log (card_id, profile_id, result, interval_before, interval_after)
     VALUES (?, ?, ?, ?, ?)`,
    [cardId, profileId, result, intervalBefore, intervalAfter]
  );
}

export async function getReviewHistoryForCard(
  db: SQLiteDatabase,
  cardId: number,
  profileId: number
): Promise<ReviewLog[]> {
  return db.getAllAsync<ReviewLog>(
    `SELECT * FROM review_log
     WHERE card_id = ? AND profile_id = ?
     ORDER BY reviewed_at ASC`,
    [cardId, profileId]
  );
}
