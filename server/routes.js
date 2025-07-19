const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./database');

const router = express.Router();

router.post('/rooms', (req, res) => {
  const roomId = uuidv4();
  
  db.run('INSERT INTO rooms (id) VALUES (?)', [roomId], function(err) {
    if (err) {
      console.error('Error creating room:', err);
      return res.status(500).json({ error: 'Failed to create room' });
    }
    
    res.json({ roomId, message: 'Room created successfully' });
  });
});

router.post('/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  
  if (!playerName) {
    return res.status(400).json({ error: 'Player name is required' });
  }
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err) {
      console.error('Error finding room:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.game_state !== 'waiting') {
      return res.status(400).json({ error: 'Game already in progress' });
    }
    
    db.all('SELECT * FROM players WHERE room_id = ?', [roomId], (err, players) => {
      if (err) {
        console.error('Error checking players:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (players.length >= 2) {
        return res.status(400).json({ error: 'Room is full' });
      }
      
      const playerId = uuidv4();
      const playerOrder = players.length;
      const isFirstPlayer = players.length === 0;
      
      db.run('INSERT INTO players (id, room_id, name, player_order) VALUES (?, ?, ?, ?)', 
        [playerId, roomId, playerName, playerOrder], function(err) {
        if (err) {
          console.error('Error adding player:', err);
          return res.status(500).json({ error: 'Failed to join room' });
        }
        
        // Set creator_id if this is the first player
        if (isFirstPlayer) {
          db.run('UPDATE rooms SET creator_id = ? WHERE id = ?', [playerId, roomId], (err) => {
            if (err) {
              console.error('Error setting room creator:', err);
            }
          });
        }
        
        res.json({ 
          playerId, 
          roomId, 
          playerName,
          message: 'Successfully joined room' 
        });
      });
    });
  });
});

router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err) {
      console.error('Error finding room:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    db.all('SELECT id, name, current_score, player_order FROM players WHERE room_id = ? ORDER BY player_order', [roomId], (err, players) => {
      if (err) {
        console.error('Error finding players:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        room: {
          id: room.id,
          gameState: room.game_state,
          currentPlayerId: room.current_player_id,
          winnerId: room.winner_id,
          creatorId: room.creator_id,
          matchSettings: room.match_format && room.match_length ? {
            format: room.match_format,
            length: room.match_length
          } : undefined,
          currentLeg: room.current_leg || 1,
          legWins: room.leg_wins ? JSON.parse(room.leg_wins) : {}
        },
        players
      });
    });
  });
});

router.post('/rooms/:roomId/reorder', (req, res) => {
  const { roomId } = req.params;
  const { playerIds } = req.body;
  
  if (!playerIds || !Array.isArray(playerIds)) {
    return res.status(400).json({ error: 'Player IDs array is required' });
  }
  
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err) {
      console.error('Error finding room:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.game_state !== 'waiting') {
      return res.status(400).json({ error: 'Cannot reorder players after game has started' });
    }
    
    db.all('SELECT id FROM players WHERE room_id = ?', [roomId], (err, players) => {
      if (err) {
        console.error('Error finding players:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const existingPlayerIds = players.map(p => p.id);
      
      if (playerIds.length !== existingPlayerIds.length || 
          !playerIds.every(id => existingPlayerIds.includes(id))) {
        return res.status(400).json({ error: 'Invalid player IDs' });
      }
      
      const updatePromises = playerIds.map((playerId, index) => {
        return new Promise((resolve, reject) => {
          db.run('UPDATE players SET player_order = ? WHERE id = ?', [index, playerId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
      
      Promise.all(updatePromises)
        .then(() => {
          res.json({ message: 'Player order updated successfully' });
        })
        .catch((err) => {
          console.error('Error updating player order:', err);
          res.status(500).json({ error: 'Failed to update player order' });
        });
    });
  });
});

router.post('/rooms/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  const { matchSettings } = req.body;
  
  db.all('SELECT * FROM players WHERE room_id = ? ORDER BY player_order', [roomId], (err, players) => {
    if (err) {
      console.error('Error finding players:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (players.length < 1) {
      return res.status(400).json({ error: 'Need at least 1 player to start' });
    }
    
    const firstPlayerId = players[0].id;
    const matchFormat = matchSettings?.format || 'first-of';
    const matchLength = matchSettings?.length || 1;
    
    // Initialize leg_wins object with all players having 0 wins
    const legWins = {};
    players.forEach(player => {
      legWins[player.id] = 0;
    });
    
    db.run(`UPDATE rooms SET 
      game_state = ?, 
      current_player_id = ?, 
      match_format = ?, 
      match_length = ?, 
      current_leg = ?, 
      leg_wins = ? 
      WHERE id = ?`, 
      ['in-progress', firstPlayerId, matchFormat, matchLength, 1, JSON.stringify(legWins), roomId], 
      function(err) {
        if (err) {
          console.error('Error starting game:', err);
          return res.status(500).json({ error: 'Failed to start game' });
        }
        
        res.json({ 
          message: 'Game started successfully', 
          currentPlayerId: firstPlayerId,
          matchSettings: { format: matchFormat, length: matchLength }
        });
      });
  });
});

module.exports = router;