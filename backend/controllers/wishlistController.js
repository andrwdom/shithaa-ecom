import Wishlist from '../models/Wishlist.js';
import Product from '../models/productModel.js';

// Add product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    // console.log('Add to wishlist - User ID:', userId);
    console.log('Add to wishlist - Product ID:', productId);
    // console.log('Add to wishlist - User object:', req.user);

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if already in wishlist
    const existingWishlistItem = await Wishlist.findOne({ user: userId, product: productId });
    if (existingWishlistItem) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    // Add to wishlist
    const wishlistItem = new Wishlist({
      user: userId,
      product: productId,
      addedAt: new Date()
    });

    await wishlistItem.save();

    res.status(201).json({ 
      success: true, 
      message: 'Added to wishlist 💖',
      data: wishlistItem 
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // console.log('Remove from wishlist - User ID:', userId);
    console.log('Remove from wishlist - Product ID:', productId);

    const deletedItem = await Wishlist.findOneAndDelete({ user: userId, product: productId });
    
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: 'Wishlist item not found' });
    }

    res.json({ 
      success: true, 
      message: 'Removed from wishlist',
      data: deletedItem 
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};

// Get user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    // console.log('Get wishlist - User ID:', userId);
    // console.log('Get wishlist - User object:', req.user);

    const wishlistItems = await Wishlist.find({ user: userId })
      .populate('product', 'name price originalPrice images description category categorySlug sizes customId')
      .sort({ addedAt: -1 });

    // Filter out items where product is null (deleted products)
    const validWishlistItems = wishlistItems.filter(item => item.product !== null);
    
    // Remove invalid wishlist items from database
    const invalidItems = wishlistItems.filter(item => item.product === null);
    if (invalidItems.length > 0) {
      console.log(`Removing ${invalidItems.length} invalid wishlist items`);
      await Wishlist.deleteMany({ 
        _id: { $in: invalidItems.map(item => item._id) } 
      });
    }

    console.log('Get wishlist - Found items:', validWishlistItems.length);

    res.json({ 
      success: true, 
      data: validWishlistItems 
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wishlist' });
  }
};

// Get wishlist count
export const getWishlistCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // console.log('Get wishlist count - User ID:', userId);

    const count = await Wishlist.countDocuments({ user: userId });

    console.log('Get wishlist count - Count:', count);

    res.json({ 
      success: true, 
      count: count 
    });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wishlist count' });
  }
}; 