import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocketIO(socketServer: Server) {
  io = socketServer;

  io.on('connection', (socket: Socket) => {
    console.log('Socket client connected:', socket.id);

    // Join a project-specific room for collaborative board editing
    socket.on('project:join', (projectId: string) => {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(projectId);
      console.log(`Socket ${socket.id} left project room: ${projectId}`);
    });

    // Join a user-specific room for notifications and background job progress
    socket.on('user:join', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user notification room: user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket client disconnected:', socket.id);
    });
  });
}

export function emitToProject(projectId: string, event: string, data: any) {
  if (io) {
    io.to(projectId).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function getIO() {
  return io;
}
