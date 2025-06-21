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
      
      db.run('INSERT INTO players (id, room_id, name) VALUES (?, ?, ?)', 
        [playerId, roomId, playerName], function(err) {
        if (err) {
          console.error('Error adding player:', err);
          return res.status(500).json({ error: 'Failed to join room' });
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
    
    db.all('SELECT id, name, current_score FROM players WHERE room_id = ?', [roomId], (err, players) => {
      if (err) {
        console.error('Error finding players:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        room: {
          id: room.id,
          gameState: room.game_state,
          currentPlayerId: room.current_player_id,
          winnerId: room.winner_id
        },
        players
      });
    });
  });
});

router.post('/rooms/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  
  db.all('SELECT * FROM players WHERE room_id = ?', [roomId], (err, players) => {
    if (err) {
      console.error('Error finding players:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (players.length < 1) {
      return res.status(400).json({ error: 'Need at least 1 player to start' });
    }
    
    const firstPlayerId = players[0].id;
    
    db.run('UPDATE rooms SET game_state = ?, current_player_id = ? WHERE id = ?', 
      ['in-progress', firstPlayerId, roomId], function(err) {
      if (err) {
        console.error('Error starting game:', err);
        return res.status(500).json({ error: 'Failed to start game' });
      }
      
      res.json({ message: 'Game started successfully', currentPlayerId: firstPlayerId });
    });
  });
});

module.exports = router;