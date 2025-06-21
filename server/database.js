const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dartmate.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        game_state TEXT DEFAULT 'waiting',
        current_player_id TEXT,
        winner_id TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        room_id TEXT,
        name TEXT NOT NULL,
        current_score INTEGER DEFAULT 501,
        socket_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT,
        room_id TEXT,
        dart1 INTEGER DEFAULT 0,
        dart2 INTEGER DEFAULT 0,
        dart3 INTEGER DEFAULT 0,
        total INTEGER,
        remaining_score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players (id),
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
}

function closeDatabase() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  closeDatabase
};