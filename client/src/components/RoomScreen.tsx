'use client';

import { useState, useEffect } from 'react';
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
      if (data.room.gameState === 'in-progress') {
        onStartGame();
      }
    });

    return () => {
      socket.off('joined-room');
      socket.off('player-joined');
      socket.off('room-state');
    };
  }, [roomId, playerId, onStartGame]);

  const loadRoomData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setRoomData(data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load room data');
    }
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
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

  return (
    <div className="text-center space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Room ID: {roomId}</h2>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-700">Players:</h3>
        <div className="space-y-2">
          {roomData?.players.map((player) => (
            <div key={player.id} className="bg-gray-100 p-4 rounded-xl border-l-4 border-purple-500">
              {player.name}
              {player.id === playerId && <span className="text-purple-600 ml-2">(You)</span>}
            </div>
          ))}
        </div>
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