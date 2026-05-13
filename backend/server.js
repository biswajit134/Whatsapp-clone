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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Messages from './models/Message.js';
import Rooms from './models/Room.js';
import User from './models/User.js';

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
  methods: ["GET", "POST"]
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

// Auth Routes
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name, email, password: hashedPassword, phone
    });

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.status(200).send('WhatsApp Clone API'));

// Listen
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
