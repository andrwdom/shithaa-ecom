import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

const testProduct = {
    _id: '65f2e0a0e52e8b2b3c0c0b1a', // Replace with a valid product ID from your database
    quantity: 1,
    size: 'M',
    price: 1000, // ₹1000
    name: 'Test Product'
};

const shippingInfo = {
    state: 'Karnataka', // Using non-Tamil Nadu state to ensure shipping fee
    address: 'Test Address',
    city: 'Test City',
    pincode: '560001'
};

async function testPaymentFlow() {
    try {
        console.log('Step 1: Creating checkout session...');
        const checkoutResponse = await axios.post(`${API_URL}/api/checkout/session/create`, {
            items: [testProduct],
            shippingInfo,
            shippingCost: 39, // ₹39 shipping
            source: 'cart',
            email: 'test@example.com'
        });

        console.log('\nCheckout Session Created:', {
            subtotal: checkoutResponse.data.subtotal,
            shipping: checkoutResponse.data.shippingCost,
            total: checkoutResponse.data.total
        });

        const sessionId = checkoutResponse.data.sessionId;

        console.log('\nStep 2: Creating PhonePe payment session...');
        const paymentResponse = await axios.post(`${API_URL}/api/payment/phonepe/create`, {
            checkoutSessionId: sessionId,
            orderSummary: {
                subtotal: checkoutResponse.data.subtotal,
                shipping: checkoutResponse.data.shippingCost
            }
        });

        console.log('\nPayment Session Created:', {
            amount: paymentResponse.data.amount,
            merchantTransactionId: paymentResponse.data.merchantTransactionId
        });

        // Verify that payment amount includes shipping
        const expectedTotal = testProduct.price + 39; // Product price + shipping
        const actualAmount = paymentResponse.data.amount / 100; // Convert from paise to rupees

        console.log('\nVerifying amounts:', {
            expectedTotal,
            actualAmount,
            shippingIncluded: actualAmount === expectedTotal
        });

        if (actualAmount !== expectedTotal) {
            console.error('❌ ERROR: Payment amount does not include shipping!');
        } else {
            console.log('✅ SUCCESS: Payment amount correctly includes shipping');
        }

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testPaymentFlow().catch(console.error);
