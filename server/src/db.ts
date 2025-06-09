import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Determine the absolute path for the data directory and database file
// __dirname is server/src, so we go up one level to server/, then into data/
const baseDir = path.resolve(__dirname, '..'); // server/
const dbDir = path.resolve(baseDir, 'data');    // server/data/
const dbPath = path.resolve(dbDir, 'usage_tracking.sqlite'); // server/data/usage_tracking.sqlite

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    // Ensure the data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created directory: ${dbDir}`);
    }
    dbInstance = new Database(dbPath, { create: true });
    // console.log(`SQLite database opened at ${dbPath}`);

    // Optional: Set PRAGMA for better performance and safety
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL');
      dbInstance.exec('PRAGMA synchronous = NORMAL'); // Can be faster, but with minor risk on power loss
    } catch (error) {
      console.warn('Could not set PRAGMA options (journal_mode, synchronous). DB might be in use or read-only.', error);
    }
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    // console.log('Database connection closed.');
  }
}

export function initializeDatabase(): void {
  const db = getDb(); // Use the getter
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_usage (
      user_key TEXT PRIMARY KEY NOT NULL,
      is_anonymous BOOLEAN NOT NULL, -- Stored as INTEGER 0 or 1
      analysis_count INTEGER NOT NULL DEFAULT 0,
      first_analysis_timestamp DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), -- Stored as TEXT
      last_analysis_timestamp DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')) -- Stored as TEXT
    );
  `;
  try {
    db.exec(createTableSQL);
    console.log('Database initialized: user_usage table checked/created.');
  } catch (error) {
    console.error('Failed to initialize database table:', error);
    throw error;
  }
}

// Export the database instance for use in other modules
// No default export, use named exports: getDb, closeDb, initializeDatabase
