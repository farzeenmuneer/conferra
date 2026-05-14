const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default
    methods: ["GET", "POST"]
  }
});

// Store active rooms
const rooms = new Map();

// REST API: Create a new room
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  rooms.set(roomId, {
    id: roomId,
    participants: [],
    createdAt: new Date()
  });
  res.json({ roomId });
});

// REST API: Check if room exists
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json({ exists: true, participants: room.participants.length });
  } else {
    res.status(404).json({ exists: false });
  }
});

// Socket.io Signaling
io.on('connection', (socket) => {
  
  // User joins a room
  socket.on('join-room', (roomId, userName) => {
    // Create room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: [],
        createdAt: new Date()
      });
    }

    const room = rooms.get(roomId);
    
    // Add user to room
    const user = {
      id: socket.id,
      name: userName || 'Anonymous',
      joinedAt: new Date()
    };
    room.participants.push(user);
    
    socket.join(roomId);
    
    // Notify existing users about new peer
    socket.to(roomId).emit('user-connected', user);
    
    // Send current participants list to new user
    const otherUsers = room.participants.filter(p => p.id !== socket.id);
    socket.emit('existing-users', otherUsers);
    
    console.log(`${user.name} joined room ${roomId}`);
  });

  // WebRTC Signaling: Offer
  socket.on('offer', (offer, targetUserId) => {
    socket.to(targetUserId).emit('offer', offer, socket.id);
  });

  // WebRTC Signaling: Answer
  socket.on('answer', (answer, targetUserId) => {
    socket.to(targetUserId).emit('answer', answer, socket.id);
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('ice-candidate', (candidate, targetUserId) => {
    socket.to(targetUserId).emit('ice-candidate', candidate, socket.id);
  });

  // Chat message
  socket.on('send-message', (roomId, message) => {
    const user = getUserInRoom(roomId, socket.id);
    socket.to(roomId).emit('receive-message', {
      user: user?.name || 'Unknown',
      text: message,
      timestamp: new Date()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      const index = room.participants.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const user = room.participants[index];
        room.participants.splice(index, 1);
        socket.to(roomId).emit('user-disconnected', user);
        
        // Delete empty rooms
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

// Helper function
function getUserInRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  return room?.participants.find(p => p.id === socketId);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Conferra server running on port ${PORT}`);
});