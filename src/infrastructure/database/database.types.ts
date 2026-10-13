export type LocalDatabaseStatus = {
  ready: boolean;
  engine: 'expo-sqlite' | 'node:sqlite' | 'unavailable';
  schemaVersion: number;
};
