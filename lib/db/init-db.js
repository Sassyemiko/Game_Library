const Database = require('better-sqlite3'); 
const path = require('path'); 
const dbPath = path.join(__dirname, 'dev.db'); 
const db = new Database(dbPath); 
console.log('Creating games table...'); 
db.exec(` 
  CREATE TABLE IF NOT EXISTS games ( 
    id TEXT PRIMARY KEY, 
    title TEXT NOT NULL, 
    platform TEXT, 
    genre TEXT, 
    status TEXT NOT NULL, 
    rating INTEGER, 
    cover_url TEXT, 
    notes TEXT, 
    hours_played REAL, 
    started_at TEXT, 
    finished_at TEXT, 
    steam_app_id INTEGER, 
    earned_achievements TEXT DEFAULT '[]', 
    created_at TEXT DEFAULT (datetime('now')), 
    updated_at TEXT DEFAULT (datetime('now')) 
  ) 
`); 
console.log('Database initialized!'); 
db.close(); 
