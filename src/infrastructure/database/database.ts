import type { LocalDatabaseStatus } from './database.types';

export type { LocalDatabaseStatus } from './database.types';

export async function initializeLocalDatabase(): Promise<LocalDatabaseStatus> {
  if (typeof window !== 'undefined' && window.ocsDesktop) {
    return window.ocsDesktop.databaseHealth();
  }

  return {
    ready: false,
    engine: 'unavailable',
    schemaVersion: 0,
  };
}
