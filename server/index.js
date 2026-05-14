const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
    messages: [],  // Store chat messages for AI summary
    createdAt: new Date()
  });
  res.json({ roomId });
});

// REST API: Check if room exists
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json({ 
      exists: true, 
      participants: room.participants.length,
      messages: room.messages.length 
    });
  } else {
    res.status(404).json({ exists: false });
  }
});

// Socket.io Signaling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a room
  socket.on('join-room', (roomId, userName) => {
    // Create room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: [],
        messages: [],
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
    
    // Store room ID on socket for disconnect handling
    socket.roomId = roomId;
    
    // Notify existing users about new peer
    socket.to(roomId).emit('user-connected', user);
    
    // Send current participants list to new user
    const otherUsers = room.participants.filter(p => p.id !== socket.id);
    socket.emit('existing-users', otherUsers);
    
    // Send existing chat messages to new user
    socket.emit('chat-history', room.messages);
    
    console.log(`${user.name} joined room ${roomId} (${room.participants.length} participants)`);
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
    const room = rooms.get(roomId);
    const user = room?.participants.find(p => p.id === socket.id);
    
    const messageData = {
      user: user?.name || 'Unknown',
      text: message,
      timestamp: new Date()
    };
    
    // Store message in room history
    if (room) {
      room.messages.push(messageData);
      
      // Keep only last 200 messages
      if (room.messages.length > 200) {
        room.messages = room.messages.slice(-200);
      }
    }
    
    // Broadcast to everyone in the room INCLUDING sender
    io.to(roomId).emit('receive-message', messageData);
    
    console.log(`Message in ${roomId} from ${messageData.user}: ${message.substring(0, 30)}...`);
  });

  // Disconnect
    socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    rooms.forEach((room, roomId) => {
      const before = room.participants.length;
      
      // Remove ALL entries for this socket (handles duplicates)
      room.participants = room.participants.filter(p => p.id !== socket.id);
      
      const after = room.participants.length;
      
      if (before !== after) {
        console.log(`Room ${roomId}: ${before} → ${after} participants`);
        socket.to(roomId).emit('user-disconnected', { id: socket.id });
      }
      
      // Clean up empty rooms
      if (room.participants.length === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Conferra server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});