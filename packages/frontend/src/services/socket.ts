import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
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

export const getSocket = () => socket;
