'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface GameFinishedScreenProps {
  onNewGame: () => void;
}

export default function GameFinishedScreen({ onNewGame }: GameFinishedScreenProps) {
  const [winnerName, setWinnerName] = useState('');

  useEffect(() => {
    const socket = getSocket();
    
    socket.on('game-finished', (data: { winnerId: string, winnerName: string }) => {
      setWinnerName(data.winnerName);
    });

    return () => {
      socket.off('game-finished');
    };
  }, []);

  return (
    <div className="text-center space-y-8">
      <h2 className="text-4xl font-bold text-green-600">🎉 Game Finished!</h2>
      <h3 className="text-2xl font-semibold text-gray-900">
        Winner: {winnerName || 'Unknown Player'}
      </h3>
      
      <button
        onClick={onNewGame}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200"
      >
        New Game
      </button>
    </div>
  );
}