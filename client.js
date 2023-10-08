"use strict";

const io = require('socket.io-client');
const fs = require('fs');

// Load SSL/TLS certificate
const options = {
    ca: fs.readFileSync('cert.pem')
};

// Connect to Socket.io server
const socket = io('https://example.com:3000', {
    secure: true,
    rejectUnauthorized: true,
    ca: options.ca
});

// Handle socket events
socket.on('connect', () => {
    console.log('Connected to server');

    socket.emit('message', 'Hello server!');
});

socket.on('message', (data) => {
    console.log('Received message:', data);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});
