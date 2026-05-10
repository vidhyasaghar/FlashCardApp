import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let instance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (instance) return instance;
  const db = await SQLite.openDatabaseAsync('flashcard.db');
  await runMigrations(db);
  instance = db;
  return db;
}
