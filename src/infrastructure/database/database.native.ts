import * as SQLite from 'expo-sqlite';

import type { LocalDatabaseStatus } from './database.types';

export type { LocalDatabaseStatus } from './database.types';

let initialization: Promise<LocalDatabaseStatus> | undefined;

export function initializeLocalDatabase(): Promise<LocalDatabaseStatus> {
  initialization ??= initialize();
  return initialization;
}

async function initialize(): Promise<LocalDatabaseStatus> {
  const database = await SQLite.openDatabaseAsync('ocs.db');

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO app_metadata (key, value)
    VALUES ('schema_version', '1');
  `);

  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'schema_version'",
  );

  return {
    ready: true,
    engine: 'expo-sqlite',
    schemaVersion: Number(row?.value ?? 0),
  };
}
