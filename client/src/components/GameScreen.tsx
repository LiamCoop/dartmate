'use client';

import { useState, useEffect } from 'react';
import { validateVisit, validateTotalScore } from '@/lib/dartboard-validator';
import { Player, RoomData, Visit } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface GameScreenProps {
  roomId: string;
  playerId: string;
  playerName: string;
  onGameFinished: () => void;
}

export default function GameScreen({ roomId, playerId, playerName, onGameFinished }: GameScreenProps) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [dart1, setDart1] = useState<number>(0);
  const [dart2, setDart2] = useState<number>(0);
  const [dart3, setDart3] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [inputMode, setInputMode] = useState<'individual' | 'total'>('individual');
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoomData();
    
    const socket = getSocket();
    socket.emit('join-room', { roomId, playerId });

    socket.on('room-state', (data: RoomData) => {
      setRoomData(data);
      if (data.room.gameState === 'finished') {
        onGameFinished();
      }
    });

    socket.on('visit-recorded', (data: Visit) => {
      setDart1(0);
      setDart2(0);
      setDart3(0);
      setTotalScore(0);
      setError('');
    });

    socket.on('turn-changed', () => {
      loadRoomData();
    });

    socket.on('game-finished', (data: { winnerId: string, winnerName: string }) => {
      onGameFinished();
    });

    socket.on('leg-finished', (data: { winnerId: string, winnerName: string, legNumber: number, currentScore: Record<string, number> }) => {
      // Room state will be updated automatically via room-state event
      console.log(`Leg ${data.legNumber} won by ${data.winnerName}`);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      socket.off('room-state');
      socket.off('visit-recorded');
      socket.off('turn-changed');
      socket.off('game-finished');
      socket.off('leg-finished');
      socket.off('error');
    };
  }, [roomId, playerId, onGameFinished]);

  const loadRoomData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setRoomData(data);
        if (data.room.gameState === 'finished') {
          onGameFinished();
        }
      }
    } catch (error) {
      console.error('Failed to load room data:', error);
    }
  };

  const submitVisit = () => {
    let finalDart1 = dart1;
    let finalDart2 = dart2;
    let finalDart3 = dart3;

    if (inputMode === 'total') {
      const totalValidation = validateTotalScore(totalScore);
      if (!totalValidation.isValid) {
        setError(totalValidation.errors.join('. '));
        return;
      }
      // For total mode, we'll send the total as dart1 and 0 for dart2 and dart3
      // The server will need to handle this case
      finalDart1 = totalScore;
      finalDart2 = 0;
      finalDart3 = 0;
    } else {
      const validation = validateVisit(dart1, dart2, dart3);
      if (!validation.isValid) {
        setError(validation.errors.join('. '));
        return;
      }
    }

    const socket = getSocket();
    socket.emit('submit-visit', { 
      dart1: finalDart1, 
      dart2: finalDart2, 
      dart3: finalDart3,
      isTotal: inputMode === 'total'
    });
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'individual' ? 'total' : 'individual');
    setDart1(0);
    setDart2(0);
    setDart3(0);
    setTotalScore(0);
    setError('');
  };

  const isMyTurn = roomData?.room.currentPlayerId === playerId;

  return (
    <div className="space-y-8">
      {/* Scores */}
      <div className="flex justify-center gap-8">
        {roomData?.players.map((player) => (
          <div 
            key={player.id} 
            className={`bg-gray-100 p-6 rounded-xl text-center min-w-[150px] border-l-4 ${
              player.id === roomData.room.currentPlayerId ? 'border-green-500 bg-green-50' : 'border-purple-500'
            }`}
          >
            <h4 className="font-semibold mb-2" style={{color: '#374151'}}>{player.name}</h4>
            <div className="text-3xl font-bold text-purple-600">{player.current_score}</div>
          </div>
        ))}
      </div>

      {/* Match Scoreboard */}
      {roomData?.room.matchSettings && (
        <div className="bg-gray-50 p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">
              {roomData.room.matchSettings.format === 'first-of' ? 'First to' : 'Best of'} {roomData.room.matchSettings.length} {roomData.room.matchSettings.length === 1 ? 'leg' : 'legs'}
            </h3>
            <span className="text-sm text-gray-600">
              Leg {roomData.room.currentLeg}
            </span>
          </div>
          <div className="flex justify-center gap-6">
            {roomData.players.map((player) => {
              const legWins = roomData.room.legWins?.[player.id] || 0;
              const requiredToWin = roomData.room.matchSettings!.format === 'first-of' 
                ? roomData.room.matchSettings!.length 
                : Math.ceil(roomData.room.matchSettings!.length / 2);
              
              return (
                <div key={player.id} className="text-center">
                  <div className="font-medium text-gray-700 mb-1">{player.name}</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {legWins}
                  </div>
                  <div className="text-xs text-gray-500">
                    {legWins >= requiredToWin ? '🏆' : `/ ${requiredToWin}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Turn */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900">
          Current Turn: {roomData?.players.find(p => p.id === roomData.room.currentPlayerId)?.name || '-'}
        </h3>
      </div>

      {/* Dart Input */}
      <div className="bg-gray-100 p-6 rounded-xl">
        <div className="text-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Enter Dart Scores:</h4>
          <button
            onClick={toggleInputMode}
            disabled={!isMyTurn}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 disabled:opacity-50"
          >
            {inputMode === 'individual' ? 'Switch to Total' : 'Switch to Individual'}
          </button>
        </div>

        {inputMode === 'individual' ? (
          <div className="flex justify-center gap-4 mb-4">
            <input
              type="number"
              value={dart1 || ''}
              onChange={(e) => setDart1(parseInt(e.target.value) || 0)}
              placeholder="Dart 1"
              disabled={!isMyTurn}
              className="w-20 p-3 border border-gray-300 rounded-lg text-center disabled:bg-gray-200"
            />
            <input
              type="number"
              value={dart2 || ''}
              onChange={(e) => setDart2(parseInt(e.target.value) || 0)}
              placeholder="Dart 2"
              disabled={!isMyTurn}
              className="w-20 p-3 border border-gray-300 rounded-lg text-center disabled:bg-gray-200"
            />
            <input
              type="number"
              value={dart3 || ''}
              onChange={(e) => setDart3(parseInt(e.target.value) || 0)}
              placeholder="Dart 3"
              disabled={!isMyTurn}
              className="w-20 p-3 border border-gray-300 rounded-lg text-center disabled:bg-gray-200"
            />
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <input
              type="number"
              value={totalScore || ''}
              onChange={(e) => setTotalScore(parseInt(e.target.value) || 0)}
              placeholder="Total Score"
              disabled={!isMyTurn}
              className="w-32 p-3 border border-gray-300 rounded-lg text-center disabled:bg-gray-200"
            />
          </div>
        )}

        <div className="text-center">
          <button
            onClick={submitVisit}
            disabled={!isMyTurn}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Visit
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-xl text-center">
          {error}
        </div>
      )}
    </div>
  );
}