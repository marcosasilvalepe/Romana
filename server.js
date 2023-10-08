"use strict";

const https = require('https');
const fs = require('fs');
const socketio = require('socket.io');

// Load SSL/TLS certificate and key
const options = {
	key: fs.readFileSync('key.pem'),
	cert: fs.readFileSync('cert.pem')
};

// Create HTTPS server
const server = https.createServer(options, (req, res) => {

	res.writeHead(200);
	res.end('Hello world!');

});

// Listen on port 3600
server.listen(3600, () => console.log('Server started on port 3600') );

// Create Socket.io server
const io = socketio(server);

// Handle socket connections
io.on('connection', (socket) => {
	console.log('Client connected');

	socket.on('message', (data) => {
		console.log('Received message:', data);

		// Broadcast message to all clients except sender
		socket.broadcast.emit('message', data);
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected');
	});
});
