import Coupon from '../models/Coupon.js';

// Generate a random coupon code
const generateCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    const { code, discountPercentage, validFrom, validUntil, usageLimit } = req.body;
    
    // If code is provided, use it (after checking uniqueness), else generate one
    let couponCode = code ? code.toUpperCase() : generateCouponCode();
    if (code) {
      const existingCoupon = await Coupon.findOne({ code: couponCode });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
    } else {
      let isUnique = false;
      while (!isUnique) {
        couponCode = generateCouponCode();
        const existingCoupon = await Coupon.findOne({ code: couponCode });
        if (!existingCoupon) isUnique = true;
      }
    }

    // Normalize date range: if validUntil is provided without time (00:00:00),
    // treat it as end-of-day to avoid premature expiry due to timezone.
    const validFromDate = new Date(validFrom)
    const validUntilDate = new Date(validUntil)
    if (
      validUntilDate.getHours() === 0 &&
      validUntilDate.getMinutes() === 0 &&
      validUntilDate.getSeconds() === 0 &&
      validUntilDate.getMilliseconds() === 0
    ) {
      validUntilDate.setHours(23, 59, 59, 999)
    }

    const coupon = new Coupon({
      code: couponCode,
      discountPercentage,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      usageLimit: usageLimit || null
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all coupons
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single coupon
export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a coupon
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a coupon
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Validate a coupon
export const validateCoupon = async (req, res) => {
  try {
    // Always use uppercase for code
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: 'Coupon is inactive' });
    }

    const now = new Date();
    // Treat same-day 'validUntil' without time as end-of-day
    const validUntil = new Date(coupon.validUntil)
    if (
      validUntil.getHours() === 0 &&
      validUntil.getMinutes() === 0 &&
      validUntil.getSeconds() === 0 &&
      validUntil.getMilliseconds() === 0
    ) {
      validUntil.setHours(23, 59, 59, 999)
    }
    if (now < coupon.validFrom || now > validUntil) {
      return res.status(400).json({ message: 'Coupon is expired' });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    res.json({
      valid: true,
      discountPercentage: coupon.discountPercentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 