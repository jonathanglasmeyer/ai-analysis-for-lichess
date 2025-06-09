/// <reference types="bun-types" />
import { initializeDatabase, getDb, closeDb } from './db';
import fs from 'node:fs';
import { Database } from 'bun:sqlite';
import path from 'node:path';

// Determine the path to the database file used by db.ts
const dbFilePath = path.resolve(__dirname, '..', 'data', 'usage_tracking.sqlite');

describe('Database Initialization and Structure (Tasks 1.4, 1.6)', () => {
  beforeEach(() => {
    closeDb(); // Close any existing global db instance from db.ts
    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath); // Delete DB file for a clean state
    }
    // initializeDatabase() will be called by the test itself, which will re-create the db and file.
  });

  afterAll(() => {
    closeDb();
    // Optional: Clean up the database file after all tests
    // if (fs.existsSync(dbFilePath)) {
    //   fs.unlinkSync(dbFilePath);
    // }
  });

  test('initializeDatabase should create the user_usage table with correct schema', () => {
    initializeDatabase(); // Creates and opens the db based on db.ts logic

    // For verification, open a new connection to the same file
    // initializeDatabase will now create and use its own instance via getDb()
    // We will get the instance for assertions after initialization
    const testDb = getDb(); // Get the instance used by initializeDatabase

    const tableCheck = testDb.query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_usage';").get();
    expect(tableCheck).toBeDefined();
    expect((tableCheck as { name: string }).name).toBe('user_usage');

    type TableInfoColumn = {
      cid: number;
      name: string;
      type: string;
      notnull: 0 | 1;
      dflt_value: any;
      pk: 0 | 1;
    };
    const columns = testDb.query("PRAGMA table_info(user_usage);").all() as TableInfoColumn[];
    expect(columns).toHaveLength(5);

    const expectedColumns = {
      user_key: { name: 'user_key', type: 'TEXT', notnull: 1, pk: 1 },
      is_anonymous: { name: 'is_anonymous', type: 'BOOLEAN', notnull: 1, pk: 0 }, // Declared as BOOLEAN NOT NULL.
      analysis_count: { name: 'analysis_count', type: 'INTEGER', notnull: 1, pk: 0 },
      first_analysis_timestamp: { name: 'first_analysis_timestamp', type: 'DATETIME', notnull: 0, pk: 0 }, // Declared as DATETIME, stored as TEXT due to STRFTIME. PRAGMA table_info reports declared type.
      last_analysis_timestamp: { name: 'last_analysis_timestamp', type: 'DATETIME', notnull: 0, pk: 0 },  // Declared as DATETIME, stored as TEXT due to STRFTIME. PRAGMA table_info reports declared type.
    };

    columns.forEach((column: TableInfoColumn) => {
      const expected = expectedColumns[column.name];
      expect(expected).toBeDefined();
      expect(column.name).toBe(expected.name);
      // Check type considering SQLite's type affinity
      // For BOOLEAN, better-sqlite3 stores it as INTEGER (0 or 1)
      // For DATETIME, with STRFTIME, it's stored as TEXT
      expect(column.type.toUpperCase()).toBe(expected.type.toUpperCase());
      expect(column.notnull).toBe(expected.notnull);
      expect(column.pk).toBe(expected.pk);
    });
    // No need to close testDb explicitly here as closeDb() in afterAll will handle it
    // and beforeEach will ensure a clean state by closing and deleting.
  });
});
