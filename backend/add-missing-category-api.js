import axios from 'axios';

// Configuration
const API_BASE_URL = 'https://shithaa.in/api'; // Production URL
const CATEGORY_DATA = {
  name: 'Zipless Feeding Dupatta Lounge Wear',
  slug: 'zipless-feeding-dupatta-lounge-wear',
  description: 'Zipless design with attached dupatta for more comfort'
};

async function addMissingCategory() {
  try {
    console.log('Adding missing category...');
    console.log('Category data:', CATEGORY_DATA);
    
    const response = await axios.post(`${API_BASE_URL}/categories`, CATEGORY_DATA);
    
    if (response.data.success) {
      console.log('✅ Successfully added category:');
      console.log(`   Name: "${response.data.data.name}"`);
      console.log(`   Slug: "${response.data.data.slug}"`);
      console.log(`   Description: "${response.data.data.description}"`);
    } else {
      console.log('❌ Failed to add category:', response.data.message);
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️  Category already exists');
      console.log(`   Slug: "${CATEGORY_DATA.slug}"`);
    } else {
      console.error('❌ Error adding category:', error.response?.data?.message || error.message);
    }
  }
}

// Run the script
addMissingCategory(); 