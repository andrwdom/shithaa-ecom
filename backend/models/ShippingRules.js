import mongoose from 'mongoose';

const shippingRuleSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    enum: ['maternity-feeding-wear', 'zipless-feeding-lounge-wear', 'non-feeding-lounge-wear', 'zipless-feeding-dupatta-lounge-wear']
  },
  categoryName: {
    type: String,
    required: true
  },
  rules: {
    tamilNadu: {
      type: Map,
      of: Number,
      required: true,
      default: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4', 69],
        ['5', 79],
        ['6', 89],
        ['7+', 99]
      ])
    },
    otherStates: {
      type: Map,
      of: Number,
      required: true,
      default: new Map([
        ['1', 49],
        ['2', 69],
        ['3', 89],
        ['4+', 109]
      ])
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Pre-save middleware to update the updatedAt field
shippingRuleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get shipping cost
shippingRuleSchema.statics.calculateShipping = function(category, quantity, state) {
  return this.findOne({ category, isActive: true })
    .then(rule => {
      if (!rule) {
        return null; // No rule found for this category
      }

      const isTamilNadu = state.trim().toLowerCase() === 'tamil nadu';
      const rules = isTamilNadu ? rule.rules.tamilNadu : rule.rules.otherStates;
      
      // Find the appropriate rule based on quantity
      let shippingCost = 0;
      
      if (quantity >= 7) {
        shippingCost = rules.get('7+') || 99;
      } else if (quantity >= 4) {
        shippingCost = rules.get('4+') || (isTamilNadu ? 99 : 109);
      } else {
        shippingCost = rules.get(quantity.toString()) || 0;
      }
      
      return {
        shippingCost,
        isFreeShipping: shippingCost === 0,
        shippingMessage: `₹${shippingCost} shipping for ${quantity} item${quantity > 1 ? 's' : ''}`,
        category: rule.categoryName,
        state: isTamilNadu ? 'Tamil Nadu' : 'Other States'
      };
    });
};

// Static method to get default rules for a category
shippingRuleSchema.statics.getDefaultRules = function(category) {
  const defaults = {
    'maternity-feeding-wear': {
      categoryName: 'Maternity Feeding Wear',
      rules: {
        tamilNadu: new Map([
          ['1', 39],
          ['2', 49],
          ['3', 59],
          ['4', 69],
          ['5', 79],
          ['6', 89],
          ['7+', 99]
        ]),
        otherStates: new Map([
          ['1', 49],
          ['2', 69],
          ['3', 89],
          ['4+', 109]
        ])
      }
    },
    'zipless-feeding-lounge-wear': {
      categoryName: 'Zipless Feeding Lounge Wear',
      rules: {
        tamilNadu: new Map([
          ['1', 0],  // Free shipping in Tamil Nadu
          ['2', 0],
          ['3', 0],
          ['4', 0],
          ['5', 0],
          ['6', 0],
          ['7+', 0]
        ]),
        otherStates: new Map([
          ['1', 39],
          ['2', 49],
          ['3', 59],
          ['4+', 69]
        ])
      }
    },
    'non-feeding-lounge-wear': {
      categoryName: 'Non-Feeding Lounge Wear',
      rules: {
        tamilNadu: new Map([
          ['1', 0],  // Free shipping in Tamil Nadu
          ['2', 0],
          ['3', 0],
          ['4', 0],
          ['5', 0],
          ['6', 0],
          ['7+', 0]
        ]),
        otherStates: new Map([
          ['1', 39],
          ['2', 49],
          ['3', 59],
          ['4+', 69]
        ])
      }
    },
    'zipless-feeding-dupatta-lounge-wear': {
      categoryName: 'Zipless Feeding Dupatta Lounge Wear',
      rules: {
        tamilNadu: new Map([
          ['1', 0],  // Free shipping in Tamil Nadu
          ['2', 0],
          ['3', 0],
          ['4', 0],
          ['5', 0],
          ['6', 0],
          ['7+', 0]
        ]),
        otherStates: new Map([
          ['1', 39],
          ['2', 49],
          ['3', 59],
          ['4+', 69]
        ])
      }
    }
  };
  
  return defaults[category] || null;
};

export default mongoose.model('ShippingRules', shippingRuleSchema); 