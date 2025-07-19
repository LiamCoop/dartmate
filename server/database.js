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
        winner_id TEXT,
        creator_id TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        room_id TEXT,
        name TEXT NOT NULL,
        current_score INTEGER DEFAULT 501,
        socket_id TEXT,
        player_order INTEGER DEFAULT 0,
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
      )`);

      // Migration: Add player_order column if it doesn't exist
      db.all("PRAGMA table_info(players)", (err, playerColumns) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.all("PRAGMA table_info(rooms)", (err, roomColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasPlayerOrder = playerColumns.some(col => col.name === 'player_order');
          const hasCreatorId = roomColumns.some(col => col.name === 'creator_id');
          const hasMatchFormat = roomColumns.some(col => col.name === 'match_format');
          const hasMatchLength = roomColumns.some(col => col.name === 'match_length');
          const hasCurrentLeg = roomColumns.some(col => col.name === 'current_leg');
          const hasLegWins = roomColumns.some(col => col.name === 'leg_wins');
          
          const migrations = [];
          
          if (!hasPlayerOrder) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE players ADD COLUMN player_order INTEGER DEFAULT 0", (err) => {
                if (err) reject(err);
                else {
                  // Update existing players with proper order
                  db.run(`
                    WITH ordered_players AS (
                      SELECT id, ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at) - 1 AS new_order
                      FROM players
                    )
                    UPDATE players 
                    SET player_order = (
                      SELECT new_order 
                      FROM ordered_players 
                      WHERE ordered_players.id = players.id
                    )
                  `, (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                }
              });
            }));
          }
          
          if (!hasCreatorId) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE rooms ADD COLUMN creator_id TEXT", (err) => {
                if (err) reject(err);
                else {
                  // Update existing rooms with creator_id as the first player
                  db.run(`
                    UPDATE rooms 
                    SET creator_id = (
                      SELECT p.id 
                      FROM players p 
                      WHERE p.room_id = rooms.id 
                      ORDER BY p.created_at 
                      LIMIT 1
                    )
                    WHERE rooms.creator_id IS NULL
                  `, (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                }
              });
            }));
          }
          
          if (!hasMatchFormat) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE rooms ADD COLUMN match_format TEXT DEFAULT 'first-of'", (err) => {
                if (err) reject(err);
                else resolve();
              });
            }));
          }
          
          if (!hasMatchLength) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE rooms ADD COLUMN match_length INTEGER DEFAULT 1", (err) => {
                if (err) reject(err);
                else resolve();
              });
            }));
          }
          
          if (!hasCurrentLeg) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE rooms ADD COLUMN current_leg INTEGER DEFAULT 1", (err) => {
                if (err) reject(err);
                else resolve();
              });
            }));
          }
          
          if (!hasLegWins) {
            migrations.push(new Promise((resolve, reject) => {
              db.run("ALTER TABLE rooms ADD COLUMN leg_wins TEXT DEFAULT '{}'", (err) => {
                if (err) reject(err);
                else resolve();
              });
            }));
          }
          
          Promise.all(migrations)
            .then(() => {
              console.log('Database initialized successfully with migrations');
              resolve();
            })
            .catch(reject);
        });
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