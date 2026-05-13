import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Messages from './models/Message.js';
import Rooms from './models/Room.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 9000;

// Set up HTTP Server and Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(helmet()); // Security headers
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow images from other domains if necessary
app.use(morgan('common')); // Logging
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
  credentials: true
}));

// DB config
const connection_url = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsappdb';

mongoose.connect(connection_url)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log('MongoDB Connection Error: ', err));

const db = mongoose.connection;
db.once('open', () => {
  console.log('DB connected');

  const msgCollection = db.collection('messagecontents');
  const msgChangeStream = msgCollection.watch();

  msgChangeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      io.emit('inserted_message', {
        _id: messageDetails._id,
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
        roomId: messageDetails.roomId
      });
    }
  });

  const roomCollection = db.collection('rooms');
  const roomChangeStream = roomCollection.watch();

  roomChangeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const roomDetails = change.fullDocument;
      io.emit('inserted_room', {
        _id: roomDetails._id,
        name: roomDetails.name,
      });
    }
  });
});

// Real-time socket connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.get('/api/rooms', async (req, res) => {
  try {
    const data = await Rooms.find({});
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/rooms/new', async (req, res) => {
  const dbRoom = req.body;
  try {
    const data = await Rooms.create(dbRoom);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const data = await Rooms.findById(req.params.roomId);
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const data = await Messages.find({ roomId: req.params.roomId });
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/messages/new', async (req, res) => {
  const dbMessage = req.body;
  try {
    const data = await Messages.create(dbMessage);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => res.status(200).send('WhatsApp Clone API'));
}

// Listen
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
