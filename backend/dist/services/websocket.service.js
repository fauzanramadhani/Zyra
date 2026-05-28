"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.emitToProject = emitToProject;
exports.emitToUser = emitToUser;
exports.getIO = getIO;
let io = null;
function initSocketIO(socketServer) {
    io = socketServer;
    io.on('connection', (socket) => {
        console.log('Socket client connected:', socket.id);
        // Join a project-specific room for collaborative board editing
        socket.on('project:join', (projectId) => {
            socket.join(projectId);
            console.log(`Socket ${socket.id} joined project room: ${projectId}`);
        });
        socket.on('project:leave', (projectId) => {
            socket.leave(projectId);
            console.log(`Socket ${socket.id} left project room: ${projectId}`);
        });
        // Join a user-specific room for notifications and background job progress
        socket.on('user:join', (userId) => {
            socket.join(`user:${userId}`);
            console.log(`Socket ${socket.id} joined user notification room: user:${userId}`);
        });
        socket.on('disconnect', () => {
            console.log('Socket client disconnected:', socket.id);
        });
    });
}
function emitToProject(projectId, event, data) {
    if (io) {
        io.to(projectId).emit(event, data);
    }
}
function emitToUser(userId, event, data) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}
function getIO() {
    return io;
}
