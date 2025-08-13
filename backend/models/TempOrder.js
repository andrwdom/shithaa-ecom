import mongoose from 'mongoose';

const tempOrderSchema = new mongoose.Schema({
  merchantOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderData: {
    userId: mongoose.Schema.Types.ObjectId,
    items: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      quantity: Number,
      price: Number,
      image: String,
      size: String
    }],
    shippingInfo: {
      fullName: String,
      email: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String
    },
    amount: Number,
    paymentMethod: String,
    email: String,
    userInfo: {
      email: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Auto-delete expired orders
tempOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TempOrder = mongoose.model('TempOrder', tempOrderSchema);

export default TempOrder; 