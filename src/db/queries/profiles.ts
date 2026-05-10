import { SQLiteDatabase } from 'expo-sqlite';
import { Profile } from '../../types';

export async function createProfile(
  db: SQLiteDatabase,
  name: string,
  pinHash?: string
): Promise<Profile> {
  const result = await db.runAsync(
    `INSERT INTO profiles (name, pin_hash) VALUES (?, ?)`,
    [name, pinHash ?? null]
  );
  const row = await db.getFirstAsync<Profile>(
    `SELECT * FROM profiles WHERE id = ?`,
    [result.lastInsertRowId]
  );
  return row!;
}

export async function getAllProfiles(db: SQLiteDatabase): Promise<Profile[]> {
  return db.getAllAsync<Profile>(`SELECT * FROM profiles ORDER BY created_at ASC`);
}

export async function getProfileById(
  db: SQLiteDatabase,
  id: number
): Promise<Profile | null> {
  return db.getFirstAsync<Profile>(`SELECT * FROM profiles WHERE id = ?`, [id]) ?? null;
}

export async function deleteProfile(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM profiles WHERE id = ?`, [id]);
}
