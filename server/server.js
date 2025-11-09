const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const DrawingState = require('./drawing-state');
const RoomManager = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

const rooms = new RoomManager();
const state = new DrawingState();
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

io.on('connection', (socket) => {
  const roomId = socket.handshake.query.roomId || 'default';
  const customName = socket.handshake.query.userName;
  const userName = customName || `User-${socket.id.substring(0, 5)}`;
  const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  
  console.log(`${userName} joined room: ${roomId}`);
  
  socket.join(roomId);
  rooms.addUser(roomId, socket.id, userName, userColor);
  
  socket.emit('init', {
    userId: socket.id,
    userName: userName,
    userColor: userColor,
    operations: state.getOperations(roomId),
    users: rooms.getUsers(roomId)
  });
  
  socket.to(roomId).emit('user-joined', { userId: socket.id, userName, userColor });
  io.to(roomId).emit('users-update', rooms.getUsers(roomId));
  
  socket.on('draw-start', (data) => {
    socket.to(roomId).emit('draw-start', { userId: socket.id, ...data });
  });
  
  socket.on('draw-move', (data) => {
    socket.to(roomId).emit('draw-move', { userId: socket.id, ...data });
  });
  
  socket.on('draw-end', (data) => {
    const op = {
      id: data.id,
      userId: socket.id,
      userName: userName,
      type: data.type,
      points: data.points,
      color: data.color,
      lineWidth: data.lineWidth,
      timestamp: Date.now()
    };
    state.addOperation(roomId, op);
    socket.to(roomId).emit('draw-end', op);
  });
  
  socket.on('cursor-move', (data) => {
    socket.to(roomId).emit('cursor-move', {
      userId: socket.id,
      userName: userName,
      userColor: userColor,
      x: data.x,
      y: data.y
    });
  });
  
  socket.on('undo', () => {
    const undone = state.undo(roomId);
    if (undone) {
      io.to(roomId).emit('undo', {
        operationId: undone.id,
        performedBy: socket.id,
        performedByName: userName
      });
    }
  });
  
  socket.on('redo', () => {
    const redone = state.redo(roomId);
    if (redone) {
      io.to(roomId).emit('redo', {
        operation: redone,
        performedBy: socket.id,
        performedByName: userName
      });
    }
  });
  
  socket.on('clear-canvas', () => {
    state.clearOperations(roomId);
    io.to(roomId).emit('clear-canvas', {
      performedBy: socket.id,
      performedByName: userName
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`${userName} left room: ${roomId}`);
    rooms.removeUser(roomId, socket.id);
    socket.to(roomId).emit('user-left', { userId: socket.id, userName });
    io.to(roomId).emit('users-update', rooms.getUsers(roomId));
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
