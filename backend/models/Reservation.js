import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  // Unique reservation identifier
  reservationId: { 
    type: String, 
    required: true,
    unique: true
  },
  
  // User information
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user',
    required: false // Allow guest reservations
  },
  userEmail: { 
    type: String, 
    required: true 
  },
  
  // Checkout session reference
  checkoutSessionId: { 
    type: String, 
    required: true,
    unique: true
  },
  
  // Reserved items
  items: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'product', 
      required: true 
    },
    size: { 
      type: String, 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true,
      min: 1
    },
    productName: { 
      type: String, 
      required: true 
    }
  }],
  
  // Reservation status
  status: { 
    type: String, 
    enum: ['active', 'confirmed', 'expired', 'cancelled'], 
    default: 'active' 
  },
  
  // Expiration handling
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for auto-expiry
  },
  
  // Metadata
  source: { 
    type: String, 
    enum: ['cart', 'buynow'], 
    required: true 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Update timestamp on save
reservationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
reservationSchema.index({ userId: 1, status: 1 });
// Note: checkoutSessionId index already exists via unique: true in schema
reservationSchema.index({ 'items.productId': 1, 'items.size': 1 });
// Note: expiresAt index already exists via TTL index in schema

// Static method to create reservation
reservationSchema.statics.createReservation = async function(reservationData) {
  const reservation = new this(reservationData);
  await reservation.save();
  return reservation;
};

// Instance method to confirm reservation (convert to order)
reservationSchema.methods.confirm = async function() {
  this.status = 'confirmed';
  await this.save();
  return this;
};

// Instance method to expire reservation
reservationSchema.methods.expire = async function() {
  this.status = 'expired';
  await this.save();
  return this;
};

// Instance method to cancel reservation
reservationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
  return this;
};

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

export default Reservation;
