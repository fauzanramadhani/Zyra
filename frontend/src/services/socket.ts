import { io, Socket } from 'socket.io-client';

const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:5000';

export const socket: Socket = io(socketUrl, {
  autoConnect: false, // Wait for user login to connect
});

export function connectSocket(userId: string) {
  if (!socket.connected) {
    socket.connect();
    socket.emit('user:join', userId);
    console.log(`Socket connected. Registered user notification room: user:${userId}`);
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
    console.log('Socket disconnected.');
  }
}

export function joinProject(projectId: string) {
  if (socket.connected) {
    socket.emit('project:join', projectId);
    console.log(`Socket joined project room: ${projectId}`);
  } else {
    // Retry once socket connects
    socket.once('connect', () => {
      socket.emit('project:join', projectId);
    });
  }
}

export function leaveProject(projectId: string) {
  if (socket.connected) {
    socket.emit('project:leave', projectId);
    console.log(`Socket left project room: ${projectId}`);
  }
}
