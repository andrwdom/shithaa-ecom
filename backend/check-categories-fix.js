import mongoose from 'mongoose';
import Category from './models/Category.js';

mongoose.connect('mongodb://localhost:27017/shitha-maternity')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const categories = await Category.find({});
    
    console.log('Current categories:');
    categories.forEach(cat => {
      console.log(`- Name: "${cat.name}" | Slug: "${cat.slug}"`);
    });
    
    // Check for the specific category
    const dupattaCategory = categories.find(cat => 
      cat.name === 'Zipless Feeding Dupatta Lounge Wear'
    );
    
    if (dupattaCategory) {
      console.log('\n✅ Found "Zipless Feeding Dupatta Lounge Wear"');
      console.log(`   Slug: "${dupattaCategory.slug}"`);
    } else {
      console.log('\n❌ "Zipless Feeding Dupatta Lounge Wear" not found');
      
      // Check if there's a similar category
      const similarCategories = categories.filter(cat => 
        cat.name.toLowerCase().includes('dupatta')
      );
      
      if (similarCategories.length > 0) {
        console.log('Similar categories found:');
        similarCategories.forEach(cat => {
          console.log(`- "${cat.name}" (slug: "${cat.slug}")`);
        });
      }
    }
    
    // Check if we need to create the missing category
    const requiredCategories = [
      'Maternity Feeding Wear',
      'Zipless Feeding Lounge Wear', 
      'Non-Feeding Lounge Wear',
      'Zipless Feeding Dupatta Lounge Wear'
    ];
    
    console.log('\nChecking required categories:');
    for (const requiredName of requiredCategories) {
      const exists = categories.find(cat => cat.name === requiredName);
      if (exists) {
        console.log(`✅ "${requiredName}" exists with slug "${exists.slug}"`);
      } else {
        console.log(`❌ "${requiredName}" is missing`);
      }
    }
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  })
  .catch(console.error); 