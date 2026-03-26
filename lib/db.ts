import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'dev.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = OFF'); // disabled during migrations, re-enabled after
  initSchema(_db);
  runMigrations(_db);
  _db.pragma('foreign_keys = ON');
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      targetLanguage TEXT NOT NULL,
      nativeLanguage TEXT NOT NULL,
      level TEXT NOT NULL,
      hardcoreMode INTEGER NOT NULL DEFAULT 0,
      hardcoreIntervalMinutes INTEGER NOT NULL DEFAULT 20,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Profile (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES User(id),
      targetLanguage TEXT NOT NULL,
      nativeLanguage TEXT NOT NULL,
      level TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS StrandSnooze (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL REFERENCES Profile(id),
      strand TEXT NOT NULL,
      snoozedUntil TEXT NOT NULL,
      snoozeCountThisWeek INTEGER NOT NULL DEFAULT 0,
      weekStartDate TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AvoidanceEvent (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL REFERENCES Profile(id),
      strand TEXT NOT NULL,
      reason TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES User(id),
      strand TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      activityType TEXT NOT NULL,
      notes TEXT,
      source TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS CorpusWord (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      word TEXT NOT NULL,
      reading TEXT,
      definition TEXT NOT NULL,
      frequencyRank INTEGER NOT NULL,
      level TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS UserWord (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES User(id),
      corpusWordId TEXT NOT NULL REFERENCES CorpusWord(id),
      status TEXT NOT NULL DEFAULT 'UNSEEN',
      encounters INTEGER NOT NULL DEFAULT 0,
      lastEncountered TEXT,
      easeFactor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 1,
      nextReview TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS StrandBalance (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES User(id),
      date TEXT NOT NULL,
      inputMinutes INTEGER NOT NULL DEFAULT 0,
      outputMinutes INTEGER NOT NULL DEFAULT 0,
      formMinutes INTEGER NOT NULL DEFAULT 0,
      fluencyMinutes INTEGER NOT NULL DEFAULT 0,
      balanceScore REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(userId, date)
    );
  `);
}

function runMigrations(db: Database.Database) {
  const cols = (table: string): string[] =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => c.name);

  const addCol = (table: string, col: string, def: string) => {
    if (!cols(table).includes(col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  };

  addCol('Session', 'profileId', 'TEXT');
  addCol('Session', 'focusRating', 'INTEGER');
  addCol('Session', 'loggedExternally', 'INTEGER NOT NULL DEFAULT 0');
  addCol('UserWord', 'profileId', 'TEXT');
  addCol('StrandBalance', 'profileId', 'TEXT');
}
