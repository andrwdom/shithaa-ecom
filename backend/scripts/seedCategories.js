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
  }
];

async function seed() {
  await connectDB();
  for (const cat of categories) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (!exists) {
      await Category.create(cat);
      console.log(`Added category: ${cat.name}`);
    } else {
      console.log(`Category already exists: ${cat.name}`);
    }
  }
  mongoose.connection.close();
}

seed(); 