import mongoose from 'mongoose';

const postSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  content: { type: String },
  mediaUrl: { type: String }, // Base64 or URL
  mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Post', postSchema);
