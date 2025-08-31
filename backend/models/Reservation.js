import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
        required: true 
    },
    items: [{
        productId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'product', 
            required: true 
        },
        qty: { 
            type: Number, 
            required: true, 
            min: 1 
        },
        priceAtReserve: { 
            type: Number, 
            required: true, 
            min: 0 
        },
        size: { 
            type: String, 
            required: true 
        }
    }],
    status: { 
        type: String, 
        enum: ['reserved', 'confirmed', 'expired', 'cancelled'], 
        default: 'reserved' 
    },
    idempotencyKey: { 
        type: String, 
        required: true, 
        unique: true 
    },
    paymentId: { 
        type: String 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    holdMinutes: { 
        type: Number, 
        default: 15 
    },
    totalAmount: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    metadata: { 
        type: mongoose.Schema.Types.Mixed 
    }
}, {
    timestamps: true
});

// Indexes for performance
reservationSchema.index({ idempotencyKey: 1 }, { unique: true });
reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 }); // For expiration worker
reservationSchema.index({ paymentId: 1 }); // For webhook lookups

// Pre-save middleware to set expiresAt if not provided
reservationSchema.pre('save', function(next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + (this.holdMinutes * 60 * 1000));
    }
    next();
});

// Method to check if reservation is expired
reservationSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to check if reservation can be confirmed
reservationSchema.methods.canConfirm = function() {
    return this.status === 'reserved' && !this.isExpired();
};

// Static method to find expired reservations
reservationSchema.statics.findExpired = function() {
    return this.find({
        status: 'reserved',
        expiresAt: { $lte: new Date() }
    });
};

// Static method to find by idempotency key
reservationSchema.statics.findByIdempotencyKey = function(key) {
    return this.findOne({ idempotencyKey: key });
};

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

export default Reservation;
