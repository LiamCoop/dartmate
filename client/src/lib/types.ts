export type GameState = 'menu' | 'room' | 'game' | 'finished';

export interface Player {
  id: string;
  name: string;
  current_score: number;
}

export interface Room {
  id: string;
  gameState: string;
  currentPlayerId: string;
  winnerId?: string;
}

export interface Visit {
  playerId: string;
  playerName: string;
  dart1: number;
  dart2: number;
  dart3: number;
  total: number;
  newScore: number;
}

export interface RoomData {
  room: Room;
  players: Player[];
}