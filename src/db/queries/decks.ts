import { SQLiteDatabase } from 'expo-sqlite';
import { Deck } from '../../types';

export async function createDeck(
  db: SQLiteDatabase,
  profileId: number,
  title: string,
  description?: string,
  cardDirection: 'front_to_back' | 'back_to_front' = 'front_to_back'
): Promise<Deck> {
  const result = await db.runAsync(
    `INSERT INTO decks (profile_id, title, description, card_direction) VALUES (?, ?, ?, ?)`,
    [profileId, title, description ?? null, cardDirection]
  );
  const row = await db.getFirstAsync<Deck>(
    `SELECT * FROM decks WHERE id = ?`,
    [result.lastInsertRowId]
  );
  return row!;
}

export async function getDecksByProfile(
  db: SQLiteDatabase,
  profileId: number
): Promise<Deck[]> {
  return db.getAllAsync<Deck>(
    `SELECT * FROM decks WHERE profile_id = ? ORDER BY created_at ASC`,
    [profileId]
  );
}

export async function getDeckById(
  db: SQLiteDatabase,
  id: number
): Promise<Deck | null> {
  return db.getFirstAsync<Deck>(`SELECT * FROM decks WHERE id = ?`, [id]) ?? null;
}

export async function deleteDeck(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM decks WHERE id = ?`, [id]);
}
