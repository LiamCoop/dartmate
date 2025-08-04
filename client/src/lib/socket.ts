import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const url = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  console.log('Connecting to socket at:', url);
  if (!socket) {
    socket = io(url, {
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
