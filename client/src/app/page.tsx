'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MainMenu from '@/components/MainMenu';
import RoomScreen from '@/components/RoomScreen';
import GameScreen from '@/components/GameScreen';
import GameFinishedScreen from '@/components/GameFinishedScreen';
import { GameState } from '@/lib/types';

function HomeContent() {
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  useEffect(() => {
    const roomIdParam = searchParams.get('roomId');
    if (roomIdParam) {
      setRoomId(roomIdParam);
    }
  }, [searchParams]);

  const handleJoinRoom = (roomId: string, playerId: string, playerName: string) => {
    setRoomId(roomId);
    setPlayerId(playerId);
    setPlayerName(playerName);
    setGameState('room');
  };

  const handleNewGame = () => {
    setRoomId('');
    setPlayerId('');
    setPlayerName('');
    setGameState('menu');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl min-h-[600px] p-8">

        {gameState === 'menu' && (
          <MainMenu onJoinRoom={handleJoinRoom} initialRoomId={roomId} />
        )}

        {gameState === 'room' && (
          <RoomScreen 
            roomId={roomId}
            playerId={playerId}
            playerName={playerName}
            onStartGame={() => setGameState('game')}
          />
        )}

        {gameState === 'game' && (
          <GameScreen 
            roomId={roomId}
            playerId={playerId}
            playerName={playerName}
            onGameFinished={() => setGameState('finished')}
          />
        )}

        {gameState === 'finished' && (
          <GameFinishedScreen onNewGame={handleNewGame} />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
