const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'command-center.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS character (
      id INTEGER PRIMARY KEY,
      name TEXT,
      title TEXT,
      nickname TEXT,
      archetype TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      bio TEXT,
      avatar_path TEXT,
      custom_stats TEXT
    );

    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      status TEXT DEFAULT 'active',
      tier TEXT DEFAULT 'side',
      progress INTEGER DEFAULT 0,
      target_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quest_objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_id INTEGER REFERENCES quests(id),
      label TEXT,
      completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      value_estimate REAL,
      notes TEXT,
      image_path TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      institution TEXT,
      type TEXT,
      balance REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT,
      name TEXT,
      current_price REAL,
      target_price REAL,
      status TEXT DEFAULT 'watching',
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exercises TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES workout_templates(id),
      date TEXT NOT NULL,
      status TEXT DEFAULT 'hit',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS fitness_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      progress INTEGER DEFAULT 0,
      target_date TEXT
    );

    CREATE TABLE IF NOT EXISTS supplements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      dose TEXT,
      timing TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS body_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS travel_pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      country TEXT,
      status TEXT DEFAULT 'planned',
      notes TEXT,
      image_path TEXT,
      target_date TEXT
    );

    CREATE TABLE IF NOT EXISTS country_statuses (
      country_code TEXT PRIMARY KEY,
      country_name TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      target_date TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rss_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      url TEXT NOT NULL,
      tag TEXT,
      active INTEGER DEFAULT 1
    );
  `);

  // Migrate legacy pin status names → visited / planned / wishlist
  db.exec(`
    UPDATE travel_pins SET status = 'visited'  WHERE status = 'conquered';
    UPDATE travel_pins SET status = 'planned'  WHERE status = 'radar';
    UPDATE travel_pins SET status = 'wishlist' WHERE status = 'dreaming';
  `);

  const row = db.prepare('SELECT id FROM character WHERE id = 1').get();
  if (!row) {
    db.prepare(`
      INSERT INTO character (id, name, title, nickname, archetype, level, xp, bio, avatar_path, custom_stats)
      VALUES (1, '', '', '', '', 1, 0, '', '', '[]')
    `).run();
  }
}

module.exports = { db, init };
