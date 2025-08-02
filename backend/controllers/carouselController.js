import CarouselBanner from '../models/CarouselBanner.js';
import { Readable } from 'stream';
import path from 'path';

// Helper function to upload buffer to Cloudinary
const uploadBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'carousel_banners',
        width: 1920,
        height: 800,
        crop: 'fill'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      }
    });

    readableStream.pipe(uploadStream);
  });
};

// Get all carousel banners
export const getCarouselBanners = async (req, res) => {
  try {
    // Check if this is an admin request (has admin middleware)
    const isAdminRequest = req.user && req.user.role === 'admin';
    
    let banners;
    if (isAdminRequest) {
      // Admin gets all banners (including inactive ones)
      banners = await CarouselBanner.find({}).sort({ order: 1 });
    } else {
      // Public gets only active banners
      banners = await CarouselBanner.find({ isActive: { $ne: false } }).sort({ order: 1 });
    }
    
    // Transform data to match frontend expectations
    const carouselData = banners.map(banner => ({
      id: banner._id.toString(),
      url: banner.image,
      alt: banner.title || 'Carousel banner',
      title: banner.title,
      link: banner.link || null,
      order: banner.order || 0,
      isActive: banner.isActive !== false,
      createdAt: banner.createdAt?.toISOString(),
      updatedAt: banner.updatedAt?.toISOString()
    }));

    res.json({
      success: true,
      data: carouselData,
      message: 'Carousel images retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching carousel banners:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch carousel images',
      error: error.message 
    });
  }
};

// Create a new carousel banner
export const createCarouselBanner = async (req, res) => {
  try {
    const { title, description, link, sectionId, order, isActive } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ message: 'Image is required' });
    }

    try {
      const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
      const imageUrl = `${baseUrl}/images/carousel/${imageFile.filename}`;

      const banner = new CarouselBanner({
        image: imageUrl,
        title,
        description,
        link: link || null,
        sectionId: sectionId || null,
        order: order || 0,
        isActive: isActive === 'true' || isActive === true || isActive === undefined
      });

      await banner.save();
      res.status(201).json(banner);
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      throw new Error(`Failed to upload image to Cloudinary: ${cloudinaryError.message}`);
    }
  } catch (error) {
    console.error('Banner creation error:', error);
    res.status(400).json({ 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update a carousel banner
export const updateCarouselBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, sectionId, order, isActive } = req.body;
    const imageFile = req.file;

    const updateData = {
      title,
      description,
      link,
      sectionId,
      order,
      isActive: isActive === 'true' || isActive === true
    };

    if (imageFile) {
      const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
      const imageUrl = `${baseUrl}/images/carousel/${imageFile.filename}`;
      updateData.image = imageUrl;
    }

    const banner = await CarouselBanner.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete a carousel banner
export const deleteCarouselBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await CarouselBanner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Delete image from Cloudinary
    const publicId = banner.image.split('/').slice(-1)[0].split('.')[0];
    await cloudinary.uploader.destroy(publicId);

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update banner order
export const updateBannerOrder = async (req, res) => {
  try {
    const { orders } = req.body;

    const updatePromises = orders.map(({ id, order }) =>
      CarouselBanner.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);
    res.json({ message: 'Banner order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 