// Import required modules
const io = require('socket.io-client');

// Connect to the Socket.IO server
const socket = io('http://localhost:3500');

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');

  // Send a message to the server
  socket.emit('message', 'Hello from the client');
});

// Handle incoming messages from the server
socket.on('message', (msg) => {
  console.log('Received message: ', msg);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
