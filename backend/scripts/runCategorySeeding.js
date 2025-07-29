import mongoose from 'mongoose';
import 'dotenv/config';
import Category from '../models/Category.js';
import connectDB from '../config/mongodb.js';

const categories = [
  {
    name: 'Maternity feeding wear',
    slug: 'maternity-feeding-wear',
    description: 'Feeding-friendly maternity wear for mothers.'
  },
  {
    name: 'Zipless feeding lounge wear',
    slug: 'zipless-feeding-lounge-wear',
    description: 'Lounge wear for feeding without zips.'
  },
  {
    name: 'Non feeding lounge wear',
    slug: 'non-feeding-lounge-wear',
    description: 'Lounge wear for non-feeding mothers.'
  },
  {
    name: 'Zipless feeding dupatta lounge wear',
    slug: 'zipless-feeding-dupatta-lounge-wear',
    description: 'Same as zipless feeding lounge wear category, add attached dupatta for more comfort.'
  }
];

async function seedCategories() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Check if categories already exist
    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ slug: categoryData.slug });
      
      if (!existingCategory) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`⚠️  Category already exists: ${categoryData.name}`);
      }
    }

    console.log('✅ Category seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedCategories();
