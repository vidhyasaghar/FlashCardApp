import { SQLiteDatabase } from 'expo-sqlite';
import { Card } from '../../types';

export async function createCard(
  db: SQLiteDatabase,
  deckId: number,
  front: string,
  back: string
): Promise<Card> {
  const result = await db.runAsync(
    `INSERT INTO cards (deck_id, front, back) VALUES (?, ?, ?)`,
    [deckId, front, back]
  );
  const row = await db.getFirstAsync<Card>(
    `SELECT * FROM cards WHERE id = ?`,
    [result.lastInsertRowId]
  );
  return row!;
}

export async function getCardsByDeck(
  db: SQLiteDatabase,
  deckId: number
): Promise<Card[]> {
  return db.getAllAsync<Card>(
    `SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC`,
    [deckId]
  );
}

export async function deleteCard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM cards WHERE id = ?`, [id]);
}
