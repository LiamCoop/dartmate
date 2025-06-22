'use client';

import { useState } from 'react';
import MainMenu from '@/components/MainMenu';
import RoomScreen from '@/components/RoomScreen';
import GameScreen from '@/components/GameScreen';
import GameFinishedScreen from '@/components/GameFinishedScreen';
import { GameState } from '@/lib/types';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  const handleJoinRoom = (roomId: string, playerId: string, playerName: string) => {
    setRoomId(roomId);
    setPlayerId(playerId);
    setPlayerName(playerName);
    setGameState('room');
  };

  const handleStartGame = () => {
    setGameState('game');
  };

  const handleGameFinished = () => {
    setGameState('finished');
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
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 DartMate</h1>
          <p className="text-gray-600 text-lg">Real-time darts matches</p>
        </header>

        {gameState === 'menu' && (
          <MainMenu onJoinRoom={handleJoinRoom} />
        )}

        {gameState === 'room' && (
          <RoomScreen 
            roomId={roomId}
            playerId={playerId}
            playerName={playerName}
            onStartGame={handleStartGame}
          />
        )}

        {gameState === 'game' && (
          <GameScreen 
            roomId={roomId}
            playerId={playerId}
            playerName={playerName}
            onGameFinished={handleGameFinished}
          />
        )}

        {gameState === 'finished' && (
          <GameFinishedScreen onNewGame={handleNewGame} />
        )}
      </div>
    </div>
  );
}