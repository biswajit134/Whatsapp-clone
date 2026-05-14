import mongoose from 'mongoose';

const statusSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio'], required: true },
  content: { type: String }, // For text status
  mediaUrl: { type: String }, // Base64 or URL for image/video/audio
  backgroundColor: { type: String, default: '#000000' }, // for text statuses
  createdAt: { type: Date, default: Date.now, expires: 86400 } // automatically delete after 24 hours (86400 seconds)
});

export default mongoose.model('Status', statusSchema);
