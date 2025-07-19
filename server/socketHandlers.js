const { db } = require('./database');
const { validateVisit, validateTotalScore } = require('./dartboard-validator');

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
    const { dart1, dart2, dart3, isTotal } = data;
    const playerId = socket.playerId;
    const roomId = socket.roomId;
    
    if (!playerId || !roomId) {
      socket.emit('error', { message: 'Not joined to a room' });
      return;
    }
    
    let finalDart1 = dart1;
    let finalDart2 = dart2;
    let finalDart3 = dart3;
    let total;

    if (isTotal) {
      // In total mode, dart1 contains the total score
      total = dart1;
      const totalValidation = validateTotalScore(total);
      if (!totalValidation.isValid) {
        socket.emit('error', { message: totalValidation.errors.join('. ') });
        return;
      }
      // For display purposes, we'll show the total as one dart
      finalDart1 = total;
      finalDart2 = 0;
      finalDart3 = 0;
    } else {
      if (dart1 === undefined || dart2 === undefined || dart3 === undefined) {
        socket.emit('error', { message: 'All three dart scores are required' });
        return;
      }
      
      const validation = validateVisit(dart1, dart2, dart3);
      if (!validation.isValid) {
        socket.emit('error', { message: validation.errors.join('. ') });
        return;
      }
      
      total = dart1 + dart2 + dart3;
    }
    
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
      
      if (newScore === 0 && !isTotal && dart3 % 2 !== 0) {
        socket.emit('error', { message: 'Must finish with a double' });
        return;
      }
      
      if (newScore === 0 && isTotal) {
        // For total mode, we can't validate the double finish rule
        // since we don't know the individual dart scores
      }
      
      db.run('INSERT INTO visits (player_id, room_id, dart1, dart2, dart3, total, remaining_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [playerId, roomId, finalDart1, finalDart2, finalDart3, total, newScore], function(err) {
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
            // Player finished this leg - handle leg completion
            handleLegCompletion(io, roomId, playerId, player.name);
          } else {
            switchTurn(io, roomId, playerId);
          }
          
          io.to(roomId).emit('visit-recorded', {
            playerId,
            playerName: player.name,
            dart1: finalDart1, dart2: finalDart2, dart3: finalDart3,
            total,
            newScore
          });
        });
      });
    });
  });

  socket.on('player-reordered', (data) => {
    const { roomId } = data;
    
    if (roomId) {
      socket.to(roomId).emit('player-reordered');
    }
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
  db.all('SELECT * FROM players WHERE room_id = ? ORDER BY player_order', [roomId], (err, players) => {
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
    
    db.all('SELECT id, name, current_score, player_order FROM players WHERE room_id = ? ORDER BY player_order', [roomId], (err, players) => {
      if (err) {
        console.error('Error finding players:', err);
        return;
      }
      
      io.to(roomId).emit('room-state', {
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
}

function handleLegCompletion(io, roomId, winnerId, winnerName) {
  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err) {
      console.error('Error finding room:', err);
      return;
    }

    const currentLegWins = room.leg_wins ? JSON.parse(room.leg_wins) : {};
    const matchFormat = room.match_format || 'first-of';
    const matchLength = room.match_length || 1;
    
    // Increment the winner's leg count
    currentLegWins[winnerId] = (currentLegWins[winnerId] || 0) + 1;
    
    // Calculate required legs to win
    const requiredLegsToWin = matchFormat === 'first-of' 
      ? matchLength 
      : Math.ceil(matchLength / 2);
    
    // Check if match is complete
    const isMatchComplete = currentLegWins[winnerId] >= requiredLegsToWin;
    
    if (isMatchComplete) {
      // Match is complete
      db.run('UPDATE rooms SET game_state = ?, winner_id = ?, leg_wins = ? WHERE id = ?', 
        ['finished', winnerId, JSON.stringify(currentLegWins), roomId], (err) => {
        if (err) {
          console.error('Error updating room state:', err);
          return;
        }
        
        io.to(roomId).emit('game-finished', { 
          winnerId: winnerId,
          winnerName: winnerName,
          finalScore: currentLegWins
        });
        
        broadcastRoomState(io, roomId);
      });
    } else {
      // Start new leg
      const newLegNumber = (room.current_leg || 1) + 1;
      
      // Reset all player scores to 501 for new leg
      db.run('UPDATE players SET current_score = 501 WHERE room_id = ?', [roomId], (err) => {
        if (err) {
          console.error('Error resetting player scores:', err);
          return;
        }
        
        // Get first player to start new leg
        db.get('SELECT id FROM players WHERE room_id = ? ORDER BY player_order LIMIT 1', [roomId], (err, firstPlayer) => {
          if (err) {
            console.error('Error finding first player:', err);
            return;
          }
          
          // Update room for new leg
          db.run('UPDATE rooms SET current_leg = ?, leg_wins = ?, current_player_id = ? WHERE id = ?', 
            [newLegNumber, JSON.stringify(currentLegWins), firstPlayer.id, roomId], (err) => {
            if (err) {
              console.error('Error updating room for new leg:', err);
              return;
            }
            
            io.to(roomId).emit('leg-finished', { 
              winnerId: winnerId,
              winnerName: winnerName,
              legNumber: room.current_leg || 1,
              currentScore: currentLegWins
            });
            
            broadcastRoomState(io, roomId);
          });
        });
      });
    }
  });
}

module.exports = { handleSocketConnection };