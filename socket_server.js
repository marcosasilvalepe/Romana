"use strict";

const port = 3500;

// Import required modules
const io = require('socket.io')(port);

// Create a Socket.IO server
const server = io.on('connection', (socket) => {
    
  console.log('Client connected');

  // Send a message to the client when they connect
  socket.emit('message', 'You are connected to the server.');

  // Handle incoming messages from the client
  socket.on('message', (msg) => {
    console.log('Received message: ', msg);

    // Send the message to all connected clients
    io.emit('message', msg);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
