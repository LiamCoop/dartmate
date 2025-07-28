'use client';

import { useState, useEffect } from 'react';

interface MainMenuProps {
  onJoinRoom: (roomId: string, playerId: string, playerName: string) => void;
  initialRoomId?: string;
}

export default function MainMenu({ onJoinRoom, initialRoomId }: MainMenuProps) {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasRoomId = Boolean(initialRoomId);

  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Automatically join the created room
        const joinResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${data.roomId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ playerName })
        });
        
        const joinData = await joinResponse.json();
        
        if (joinResponse.ok) {
          onJoinRoom(joinData.roomId, joinData.playerId, joinData.playerName);
        } else {
          setError(joinData.error);
        }
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!initialRoomId) {
      setError('No room ID provided');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${initialRoomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onJoinRoom(data.roomId, data.playerId, data.playerName);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-800">Dartmate</h1>
        <p className="text-lg text-gray-600">Play '01' games with your friends!</p>
      </div>
      
      <div className="space-y-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter Your Name"
          className="w-full max-w-md mx-auto block px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        
        {hasRoomId ? (
          <button
            onClick={joinRoom}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </button>
        ) : (
          <button
            onClick={createRoom}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
