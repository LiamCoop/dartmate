'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoomData } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface RoomScreenProps {
  roomId: string;
  playerId: string;
  playerName: string;
  onStartGame: () => void;
}

export default function RoomScreen({ roomId, playerId, playerName, onStartGame }: RoomScreenProps) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [matchFormat, setMatchFormat] = useState<'first-of' | 'best-of'>('first-of');
  const [matchLength, setMatchLength] = useState<number>(1);

  const loadRoomData = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setRoomData(data);
        setError('');
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load room data');
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomData();
    
    const socket = getSocket();
    socket.emit('join-room', { roomId, playerId });

    socket.on('joined-room', () => {
      loadRoomData();
    });

    socket.on('player-joined', () => {
      loadRoomData();
    });

    socket.on('room-state', (data: RoomData) => {
      setRoomData(data);
      setError('');
      if (data.room.gameState === 'in-progress') {
        onStartGame();
      }
    });

    socket.on('player-reordered', () => {
      loadRoomData();
    });

    return () => {
      socket.off('joined-room');
      socket.off('player-joined');
      socket.off('room-state');
      socket.off('player-reordered');
    };
  }, [roomId, playerId, onStartGame, loadRoomData]);

  const startGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchSettings: {
            format: matchFormat,
            length: matchLength
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setError('');
        onStartGame();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const reorderPlayers = async (newPlayerIds: string[]) => {
    setIsReordering(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerIds: newPlayerIds })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setError('');
        loadRoomData();
        const socket = getSocket();
        socket.emit('player-reordered', { roomId });
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to reorder players');
    } finally {
      setIsReordering(false);
    }
  };

  const movePlayerUp = (playerIndex: number) => {
    if (!roomData || playerIndex === 0) return;
    
    const newPlayers = [...roomData.players];
    [newPlayers[playerIndex - 1], newPlayers[playerIndex]] = [newPlayers[playerIndex], newPlayers[playerIndex - 1]];
    
    const newPlayerIds = newPlayers.map(p => p.id);
    reorderPlayers(newPlayerIds);
  };

  const movePlayerDown = (playerIndex: number) => {
    if (!roomData || playerIndex === roomData.players.length - 1) return;
    
    const newPlayers = [...roomData.players];
    [newPlayers[playerIndex], newPlayers[playerIndex + 1]] = [newPlayers[playerIndex + 1], newPlayers[playerIndex]];
    
    const newPlayerIds = newPlayers.map(p => p.id);
    reorderPlayers(newPlayerIds);
  };

  const isRoomCreator = roomData?.room.creatorId === playerId;

  const copyRoomLink = async () => {
    try {
      const roomLink = `${window.location.origin}?roomId=${roomId}`;
      await navigator.clipboard.writeText(roomLink);
    } catch (err) {
      console.error('Failed to copy room link:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-800">Waiting Room</h2>
          <button
            onClick={copyRoomLink}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          >
            Copy Room Link
          </button>
        </div>
        
        {isRoomCreator && roomData?.room.gameState === 'waiting' && (
          <div className="bg-gray-50 p-3 rounded-lg border">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Match Settings</h4>
            <div className="space-y-2">
              <div className="flex space-x-3">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="matchFormat"
                    value="first-of"
                    checked={matchFormat === 'first-of'}
                    onChange={(e) => setMatchFormat(e.target.value as 'first-of' | 'best-of')}
                    className="text-purple-600 focus:ring-purple-500 w-3 h-3"
                  />
                  <span className="text-xs font-medium text-gray-700">First to</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="matchFormat"
                    value="best-of"
                    checked={matchFormat === 'best-of'}
                    onChange={(e) => setMatchFormat(e.target.value as 'first-of' | 'best-of')}
                    className="text-purple-600 focus:ring-purple-500 w-3 h-3"
                  />
                  <span className="text-xs font-medium text-gray-700">Best of</span>
                </label>
              </div>
              <div className="flex space-x-3">
                {[1, 3, 5, 7, 9, 11].map((num) => (
                  <label key={num} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="matchLength"
                      value={num}
                      checked={matchLength === num}
                      onChange={(e) => setMatchLength(parseInt(e.target.value))}
                      className="text-purple-600 focus:ring-purple-500 w-3 h-3"
                    />
                    <span className="text-xs font-medium text-gray-700">{num}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Players:</h3>
        <div className="space-y-2">
          {roomData?.players.map((player, index) => (
            <div key={player.id} className="bg-gray-100 p-4 rounded-xl border-l-4 border-purple-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                <span className="text-gray-900">{player.name}</span>
                {player.id === playerId && <span className="text-purple-600 ml-2">(You)</span>}
                {index === 0 && <span className="text-green-600 ml-2 text-sm font-medium">(Plays First)</span>}
              </div>
              
              {isRoomCreator && roomData.room.gameState === 'waiting' && roomData.players.length > 1 && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => movePlayerUp(index)}
                    disabled={index === 0 || isReordering}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-sm font-medium disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => movePlayerDown(index)}
                    disabled={index === roomData.players.length - 1 || isReordering}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-sm font-medium disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {isRoomCreator && roomData?.room.gameState === 'waiting' && roomData.players.length > 1 && (
          <p className="text-sm text-gray-800 mt-2">
            As the room creator, you can reorder players. The first player will play first.
          </p>
        )}
      </div>
      
      {roomData?.players && roomData.players.length >= 1 && (
        <button
          onClick={startGame}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Starting...' : 'Start Game'}
        </button>
      )}

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
