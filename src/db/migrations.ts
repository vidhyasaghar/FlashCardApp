import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA foreign_keys = ON;`);
  await db.execAsync(SCHEMA_SQL);
}
