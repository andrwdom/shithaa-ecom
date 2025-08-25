import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

const testStates = [
    'Tamil Nadu',
    'TamilNadu',
    'Tamilnadu',
    'TAMILNADU',
    'tamil nadu',
    'tamil'
];

const testProduct = {
    _id: '65f2e0a0e52e8b2b3c0c0b1a', // Replace with a valid product ID from your database
    quantity: 1,
    size: 'M'
};

async function testShippingCalculation() {
    console.log('Testing shipping calculation for various Tamil Nadu state formats...\n');

    for (const state of testStates) {
        try {
            const response = await axios.post(`${API_URL}/api/shipping/calculate`, {
                items: [testProduct],
                shippingInfo: {
                    state: state
                }
            });

            console.log(`State: "${state}"`);
            console.log('Shipping Cost:', response.data.shippingCost);
            console.log('Is Free Shipping:', response.data.shippingCost === 0 ? 'Yes' : 'No');
            console.log('---\n');
        } catch (error) {
            console.error(`Error testing state "${state}":`, error.response?.data || error.message);
            console.log('---\n');
        }
    }
}

testShippingCalculation().catch(console.error);
