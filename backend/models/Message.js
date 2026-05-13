import mongoose from 'mongoose';

const whatsappSchema = mongoose.Schema({
  message: String,
  name: String,
  timestamp: String,
  received: Boolean,
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'rooms'
  }
});

export default mongoose.model('messagecontents', whatsappSchema);
