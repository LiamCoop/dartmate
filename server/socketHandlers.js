const { db } = require('./database');

function handleSocketConnection(io, socket) {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, playerId } = data;
    
    if (!roomId || !playerId) {
      socket.emit('error', { message: 'Room ID and Player ID are required' });
      return;
    }
    
    db.get('SELECT * FROM players WHERE id = ? AND room_id = ?', [playerId, roomId], (err, player) => {
      if (err) {
        console.error('Error finding player:', err);
        socket.emit('error', { message: 'Database error' });
        return;
      }
      
      if (!player) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }
      
      db.run('UPDATE players SET socket_id = ? WHERE id = ?', [socket.id, playerId], (err) => {
        if (err) {
          console.error('Error updating player socket:', err);
          return;
        }
        
        socket.join(roomId);
        socket.playerId = playerId;
        socket.roomId = roomId;
        
        socket.emit('joined-room', { roomId, playerId });
        socket.to(roomId).emit('player-joined', { 
          playerId, 
          playerName: player.name 
        });
        
        broadcastRoomState(io, roomId);
      });
    });
  });

  socket.on('submit-visit', (data) => {
    const { dart1, dart2, dart3 } = data;
    const playerId = socket.playerId;
    const roomId = socket.roomId;
    
    if (!playerId || !roomId) {
      socket.emit('error', { message: 'Not joined to a room' });
      return;
    }
    
    if (dart1 === undefined || dart2 === undefined || dart3 === undefined) {
      socket.emit('error', { message: 'All three dart scores are required' });
      return;
    }
    
    const total = dart1 + dart2 + dart3;
    
    db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
      if (err) {
        console.error('Error finding player:', err);
        socket.emit('error', { message: 'Database error' });
        return;
      }
      
      const newScore = player.current_score - total;
      
      if (newScore < 0) {
        socket.emit('error', { message: 'Bust! Score cannot go below 0' });
        return;
      }
      
      if (newScore === 0 && dart3 % 2 !== 0) {
        socket.emit('error', { message: 'Must finish with a double' });
        return;
      }
      
      db.run('INSERT INTO visits (player_id, room_id, dart1, dart2, dart3, total, remaining_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [playerId, roomId, dart1, dart2, dart3, total, newScore], function(err) {
        if (err) {
          console.error('Error recording visit:', err);
          socket.emit('error', { message: 'Failed to record visit' });
          return;
        }
        
        db.run('UPDATE players SET current_score = ? WHERE id = ?', [newScore, playerId], (err) => {
          if (err) {
            console.error('Error updating player score:', err);
            return;
          }
          
          if (newScore === 0) {
            db.run('UPDATE rooms SET game_state = ?, winner_id = ? WHERE id = ?', 
              ['finished', playerId, roomId], (err) => {
              if (err) {
                console.error('Error updating room state:', err);
                return;
              }
              
              io.to(roomId).emit('game-finished', { 
                winnerId: playerId,
                winnerName: player.name
              });
              
              broadcastRoomState(io, roomId);
            });
          } else {
            switchTurn(io, roomId, playerId);
          }
          
          io.to(roomId).emit('visit-recorded', {
            playerId,
            playerName: player.name,
            dart1, dart2, dart3,
            total,
            newScore
          });
        });
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.playerId && socket.roomId) {
      db.run('UPDATE players SET socket_id = NULL WHERE id = ?', [socket.playerId], (err) => {
        if (err) {
          console.error('Error clearing player socket:', err);
        }
      });
      
      socket.to(socket.roomId).emit('player-disconnected', { 
        playerId: socket.playerId 
      });
    }
  });
}

function switchTurn(io, roomId, currentPlayerId) {
  db.all('SELECT * FROM players WHERE room_id = ? ORDER BY created_at', [roomId], (err, players) => {
    if (err) {
      console.error('Error finding players:', err);
      return;
    }
    
    if (players.length < 2) {
      return;
    }
    
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayerId = players[nextIndex].id;
    
    db.run('UPDATE rooms SET current_player_id = ? WHERE id = ?', [nextPlayerId, roomId], (err) => {
      if (err) {
        console.error('Error switching turn:', err);
        return;
      }
      
      io.to(roomId).emit('turn-changed', { 
        currentPlayerId: nextPlayerId,
        currentPlayerName: players[nextIndex].name
      });
      
      broadcastRoomState(io, roomId);
    });
  });
}

function broadcastRoomState(io, roomId) {
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err) {
      console.error('Error finding room:', err);
      return;
    }
    
    db.all('SELECT id, name, current_score FROM players WHERE room_id = ?', [roomId], (err, players) => {
      if (err) {
        console.error('Error finding players:', err);
        return;
      }
      
      io.to(roomId).emit('room-state', {
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
}

module.exports = { handleSocketConnection };