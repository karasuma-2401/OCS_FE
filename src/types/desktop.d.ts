import type { LocalDatabaseStatus } from '@/infrastructure/database/database.types';

declare global {
  interface Window {
    ocsDesktop?: {
      databaseHealth: () => Promise<LocalDatabaseStatus>;
      platform: 'windows';
    };
  }
}

export {};
