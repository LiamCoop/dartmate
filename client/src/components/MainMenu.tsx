'use client';

import { useState } from 'react';

interface MainMenuProps {
  onJoinRoom: (roomId: string, playerId: string, playerName: string) => void;
}

export default function MainMenu({ onJoinRoom }: MainMenuProps) {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async () => {
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
        setRoomId(data.roomId);
        setError('Room created! Share the Room ID with other players.');
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
    if (!roomId.trim() || !playerName.trim()) {
      setError('Please enter both Room ID and Player Name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}/join`, {
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
      <button
        onClick={createRoom}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Room'}
      </button>
      
      <div className="space-y-4">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter Room ID"
          className="w-full max-w-md mx-auto block px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter Your Name"
          className="w-full max-w-md mx-auto block px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        
        <button
          onClick={joinRoom}
          disabled={isLoading}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
      </div>

      {error && (
        <div className={`p-4 rounded-xl ${error.includes('created') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}
    </div>
  );
}