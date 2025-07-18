import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'order'
  seq: { type: Number, default: 10000 }, // Start from 10000 for nice order numbers
});

const counterModel = mongoose.models.counter || mongoose.model('counter', counterSchema);
export default counterModel; 