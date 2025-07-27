# DartMate - Real-time Darts Match Application

<img width="685" height="831" alt="image" src="https://github.com/user-attachments/assets/06c6aecd-ba87-44f8-b7dc-1bfa095f6ad8" />


A real-time multiplayer darts application with room-based gameplay, built with Node.js backend and Next.js frontend.

## Project Structure

```
dartmate/
├── server/          # Node.js backend with Express + Socket.io
│   ├── server.js    # Main server file
│   ├── routes.js    # API routes
│   ├── socketHandlers.js # WebSocket handlers
│   ├── database.js  # SQLite database setup
│   ├── dartboard-validator.js # Dart score validation
│   └── public/      # Static files for basic HTML client
└── client/          # Next.js frontend application
    ├── src/
    │   ├── app/     # Next.js app directory
    │   ├── components/ # React components
    │   └── lib/     # Utilities and types
    └── package.json
```

## Features

- **Room System**: Create and join rooms with unique IDs
- **Real-time Gameplay**: Live score updates via WebSocket
- **501 Darts Game**: Complete game logic with proper scoring
- **Dartboard Validation**: Validates dart scores against actual dartboard rules
- **Multiple Clients**: Basic HTML client + Modern Next.js client

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Running the Backend Server

```bash
cd server
npm install
npm start
```

Server runs on http://localhost:3000

### Running the Next.js Client

```bash
cd client
npm install
npm run dev
```

Client runs on http://localhost:3001

### Using the Basic HTML Client

Navigate to http://localhost:3000 for the basic HTML interface.

## Game Rules

- Players start with 501 points
- Each visit consists of 3 darts
- Subtract dart total from current score
- Must finish exactly on 0 with a double
- Proper dartboard validation enforced

## API Endpoints

- `POST /api/rooms` - Create a new room
- `POST /api/rooms/:id/join` - Join a room
- `GET /api/rooms/:id` - Get room state
- `POST /api/rooms/:id/start` - Start the game

## WebSocket Events

- `join-room` - Join a room
- `submit-visit` - Submit dart scores
- `room-state` - Room state updates
- `visit-recorded` - Visit confirmation
- `game-finished` - Game completion

## Development

The application uses proper dartboard score validation, ensuring only valid dart scores are accepted:
- Singles: 1-20, 25 (outer bull)
- Doubles: 2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40, 50 (inner bull)
- Triples: 3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57,60
- Miss: 0
