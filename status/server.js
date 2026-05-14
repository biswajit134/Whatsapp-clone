import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import Status from './models/Status.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 9002;

// Middleware
app.use(express.json({ limit: '100mb' })); // High limit for 1-min video/audio
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan('common'));
app.use(cors());

// DB config
const connection_url = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsappdb';

mongoose.connect(connection_url)
  .then(() => console.log('Status MongoDB Connected'))
  .catch((err) => console.log('MongoDB Connection Error: ', err));

// API Routes

// Group statuses by user
app.get('/api/status', async (req, res) => {
  try {
    const statuses = await Status.find()
      .sort({ createdAt: 1 })
      .populate('userId', 'name profilePic');
      
    // Grouping logic
    const grouped = statuses.reduce((acc, status) => {
      if (!status.userId) return acc;
      const userId = status.userId._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: status.userId,
          statuses: []
        };
      }
      acc[userId].statuses.push(status);
      return acc;
    }, {});
    
    // Convert to array and sort by most recent update
    const result = Object.values(grouped).sort((a, b) => {
      const lastA = a.statuses[a.statuses.length - 1].createdAt;
      const lastB = b.statuses[b.statuses.length - 1].createdAt;
      return new Date(lastB) - new Date(lastA);
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new status
app.post('/api/status', async (req, res) => {
  try {
    const { userId, type, content, mediaUrl, backgroundColor } = req.body;
    
    // In frontend we should enforce 1 min duration before converting to base64, 
    // but the backend accepts it as long as it's within the 100mb body limit.
    
    const newStatus = await Status.create({ 
      userId, 
      type, 
      content, 
      mediaUrl, 
      backgroundColor 
    });
    
    const populated = await Status.findById(newStatus._id).populate('userId', 'name profilePic');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.status(200).send('Status Microservice API'));

app.listen(port, () => console.log(`Status Service listening on port ${port}`));
