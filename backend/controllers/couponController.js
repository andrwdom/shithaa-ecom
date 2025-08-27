import Coupon from '../models/Coupon.js';

// Get all coupons (admin only)
export const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Failed to fetch coupons' });
    }
};

// Create a new coupon (admin only)
export const createCoupon = async (req, res) => {
  try {
    const { code, discountPercentage, validFrom, validUntil, usageLimit } = req.body;
    
        // Generate a random code if none provided
        const couponCode = code || generateRandomCode();

    const coupon = new Coupon({
      code: couponCode,
      discountPercentage,
            validFrom,
            validUntil,
            usageLimit: usageLimit || null,
            usedCount: 0
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ message: 'Failed to create coupon' });
    }
};

// Delete a coupon (admin only)
export const deleteCoupon = async (req, res) => {
  try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

// Validate a coupon code (public)
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    const normalizedCode = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
    }

        // Check if coupon is expired
    const now = new Date();
        if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
            return res.status(400).json({ message: 'Coupon is not valid at this time' });
        }

        // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    res.json({
      valid: true,
      discountPercentage: coupon.discountPercentage,
      code: coupon.code
    });
  } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ message: 'Failed to validate coupon' });
    }
};

// Helper function to generate random coupon code
function generateRandomCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}