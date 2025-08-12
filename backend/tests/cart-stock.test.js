import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { addToCart, updateCart, removeFromCart, getUserCart, calculateCartTotal } from '../controllers/cartController.js';
// import { reserveStock, releaseStock, checkStockAvailability, getProductStock } from '../controllers/stockController.js';
import userModel from '../models/userModel.js';
import productModel from '../models/productModel.js';

let mongoServer;
let testUser;
let testProduct;

// Mock request and response objects
const createMockReq = (body = {}, user = {}) => ({
    body,
    user,
    params: {}
});

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Setup test database
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create test user
    testUser = await userModel.create({
        name: 'Test User',
        email: 'test@example.com',
        cartData: {}
    });
    
    // Create test product
    testProduct = await productModel.create({
        customId: 'TEST001',
        name: 'Test Product',
        price: 1000,
        description: 'Test product description',
        images: ['test-image.jpg'],
        category: 'Test Category',
        categorySlug: 'test-category',
        sizes: [
            { size: 'S', stock: 10 },
            { size: 'M', stock: 15 },
            { size: 'L', stock: 20 }
        ]
    });
});

// Clean up after each test
afterEach(async () => {
    // Reset user cart
    await userModel.findByIdAndUpdate(testUser._id, { cartData: {} });
    
    // Reset product stock
    await productModel.findByIdAndUpdate(testProduct._id, {
        sizes: [
            { size: 'S', stock: 10 },
            { size: 'M', stock: 15 },
            { size: 'L', stock: 20 }
        ]
    });
});

// Clean up after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Cart Controller Tests', () => {
    describe('addToCart', () => {
        test('should add item to cart with sufficient stock', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M',
                quantity: 2
            });
            const res = createMockRes();
            
            await addToCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Added To Cart',
                    data: expect.objectContaining({
                        quantity: 2,
                        availableStock: 13 // 15 - 2
                    })
                })
            );
            
            // Verify cart was updated
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]['M']).toBe(2);
        });
        
        test('should reject adding item when stock is insufficient', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'S',
                quantity: 15 // More than available stock (10)
            });
            const res = createMockRes();
            
            await addToCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('Insufficient stock')
                })
            );
            
            // Verify cart was not updated
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]).toBeUndefined();
        });
        
        test('should reject adding item with invalid size', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'XL', // Size doesn't exist
                quantity: 1
            });
            const res = createMockRes();
            
            await addToCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('Size XL not available')
                })
            );
        });
        
        test('should reject adding item with invalid quantity', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M',
                quantity: 0 // Invalid quantity
            });
            const res = createMockRes();
            
            await addToCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('Quantity must be at least 1')
                })
            );
        });
    });
    
    describe('updateCart', () => {
        beforeEach(async () => {
            // Add item to cart first
            await userModel.findByIdAndUpdate(testUser._id, {
                cartData: {
                    [testProduct._id.toString()]: { 'M': 2 }
                }
            });
        });
        
        test('should update cart quantity with sufficient stock', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M',
                quantity: 5
            });
            const res = createMockRes();
            
            await updateCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Cart Updated'
                })
            );
            
            // Verify cart was updated
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]['M']).toBe(5);
        });
        
        test('should remove item when quantity is 0', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M',
                quantity: 0
            });
            const res = createMockRes();
            
            await updateCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Item removed from cart'
                })
            );
            
            // Verify item was removed
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]['M']).toBeUndefined();
        });
        
        test('should reject update when stock is insufficient', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M',
                quantity: 20 // More than available stock (15)
            });
            const res = createMockRes();
            
            await updateCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('Insufficient stock')
                })
            );
        });
    });
    
    describe('removeFromCart', () => {
        beforeEach(async () => {
            // Add item to cart first
            await userModel.findByIdAndUpdate(testUser._id, {
                cartData: {
                    [testProduct._id.toString()]: { 'M': 2, 'L': 1 }
                }
            });
        });
        
        test('should remove specific size from cart', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'M'
            });
            const res = createMockRes();
            
            await removeFromCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Item removed from cart'
                })
            );
            
            // Verify only M size was removed
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]['M']).toBeUndefined();
            expect(updatedUser.cartData[testProduct._id.toString()]['L']).toBe(1);
        });
        
        test('should remove entire product when no sizes left', async () => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'L'
            });
            const res = createMockRes();
            
            await removeFromCart(req, res);
            
            // Verify product was completely removed
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]).toBeUndefined();
        });
    });
    
    describe('getUserCart', () => {
        test('should return empty cart for new user', async () => {
            const req = createMockReq({
                userId: testUser._id.toString()
            });
            const res = createMockRes();
            
            await getUserCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    cartData: {},
                    hasStockIssues: false
                })
            );
        });
        
        test('should validate cart items against current stock', async () => {
            // Add item to cart
            await userModel.findByIdAndUpdate(testUser._id, {
                cartData: {
                    [testProduct._id.toString()]: { 'M': 2 }
                }
            });
            
            // Reduce stock to make cart invalid
            await productModel.findByIdAndUpdate(testProduct._id, {
                'sizes.1.stock': 1 // M size now has only 1 in stock
            });
            
            const req = createMockReq({
                userId: testUser._id.toString()
            });
            const res = createMockRes();
            
            await getUserCart(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    hasStockIssues: true
                })
            );
            
            // Verify cart was adjusted
            const updatedUser = await userModel.findById(testUser._id);
            expect(updatedUser.cartData[testProduct._id.toString()]['M']).toBe(1);
        });
    });
    
    describe('calculateCartTotal', () => {
        test('should calculate total for valid items', async () => {
            const req = createMockReq({
                items: [
                    {
                        _id: testProduct._id.toString(),
                        size: 'M',
                        quantity: 2,
                        price: 1000
                    }
                ]
            });
            const res = createMockRes();
            
            await calculateCartTotal(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        subtotal: 2000,
                        total: 2000,
                        hasStockIssues: false
                    })
                })
            );
        });
        
        test('should adjust quantities for insufficient stock', async () => {
            // Reduce stock
            await productModel.findByIdAndUpdate(testProduct._id, {
                'sizes.1.stock': 1 // M size now has only 1 in stock
            });
            
            const req = createMockReq({
                items: [
                    {
                        _id: testProduct._id.toString(),
                        size: 'M',
                        quantity: 3, // Requesting more than available
                        price: 1000
                    }
                ]
            });
            const res = createMockRes();
            
            await calculateCartTotal(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        hasStockIssues: true,
                        validatedItems: expect.arrayContaining([
                            expect.objectContaining({
                                quantity: 1 // Adjusted to available stock
                            })
                        ])
                    })
                })
            );
        });
    });
});

describe('Stock Controller Tests', () => {
    describe('reserveStock', () => {
        test('should reserve stock for valid items', async () => {
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'M',
                    quantity: 3
                }
            ];
            
            const reservedItems = await reserveStock(items);
            
            expect(reservedItems).toHaveLength(1);
            expect(reservedItems[0]).toMatchObject({
                _id: testProduct._id.toString(),
                size: 'M',
                quantity: 3,
                productName: 'Test Product'
            });
            
            // Verify stock was reduced
            const updatedProduct = await productModel.findById(testProduct._id);
            const mSize = updatedProduct.sizes.find(s => s.size === 'M');
            expect(mSize.stock).toBe(12); // 15 - 3
        });
        
        test('should reject reservation when stock is insufficient', async () => {
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'S',
                    quantity: 15 // More than available (10)
                }
            ];
            
            await expect(reserveStock(items)).rejects.toThrow('Insufficient stock');
            
            // Verify stock was not changed
            const updatedProduct = await productModel.findById(testProduct._id);
            const sSize = updatedProduct.sizes.find(s => s.size === 'S');
            expect(sSize.stock).toBe(10);
        });
        
        test('should handle multiple items atomically', async () => {
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'S',
                    quantity: 2
                },
                {
                    _id: testProduct._id.toString(),
                    size: 'M',
                    quantity: 3
                }
            ];
            
            const reservedItems = await reserveStock(items);
            
            expect(reservedItems).toHaveLength(2);
            
            // Verify all stock was reduced
            const updatedProduct = await productModel.findById(testProduct._id);
            const sSize = updatedProduct.sizes.find(s => s.size === 'S');
            const mSize = updatedProduct.sizes.find(s => s.size === 'M');
            expect(sSize.stock).toBe(8); // 10 - 2
            expect(mSize.stock).toBe(12); // 15 - 3
        });
    });
    
    describe('releaseStock', () => {
        test('should release reserved stock', async () => {
            // First reserve some stock
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'M',
                    quantity: 3
                }
            ];
            
            await reserveStock(items);
            
            // Then release it
            const releasedItems = await releaseStock(items);
            
            expect(releasedItems).toHaveLength(1);
            expect(releasedItems[0]).toMatchObject({
                productId: testProduct._id,
                size: 'M',
                quantity: 3
            });
            
            // Verify stock was restored
            const updatedProduct = await productModel.findById(testProduct._id);
            const mSize = updatedProduct.sizes.find(s => s.size === 'M');
            expect(mSize.stock).toBe(15); // Back to original
        });
    });
    
    describe('checkStockAvailability', () => {
        test('should check stock for valid items', async () => {
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'M',
                    quantity: 5
                }
            ];
            
            const stockChecks = await checkStockAvailability(items);
            
            expect(stockChecks).toHaveLength(1);
            expect(stockChecks[0]).toMatchObject({
                available: true,
                currentStock: 15,
                requestedQuantity: 5,
                productName: 'Test Product'
            });
        });
        
        test('should identify insufficient stock', async () => {
            const items = [
                {
                    _id: testProduct._id.toString(),
                    size: 'S',
                    quantity: 15 // More than available (10)
                }
            ];
            
            const stockChecks = await checkStockAvailability(items);
            
            expect(stockChecks).toHaveLength(1);
            expect(stockChecks[0]).toMatchObject({
                available: false,
                currentStock: 10,
                requestedQuantity: 15,
                error: expect.stringContaining('Insufficient stock')
            });
        });
    });
    
    describe('getProductStock', () => {
        test('should return product stock information', async () => {
            const stockInfo = await getProductStock(testProduct._id);
            
            expect(stockInfo).toMatchObject({
                productId: testProduct._id,
                productName: 'Test Product',
                totalStock: 45, // 10 + 15 + 20
                inStock: true
            });
            
            expect(stockInfo.sizes).toHaveLength(3);
            expect(stockInfo.sizes).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        size: 'S',
                        stock: 10,
                        inStock: true
                    }),
                    expect.objectContaining({
                        size: 'M',
                        stock: 15,
                        inStock: true
                    }),
                    expect.objectContaining({
                        size: 'L',
                        stock: 20,
                        inStock: true
                    })
                ])
            );
        });
    });
});

describe('Concurrency Tests', () => {
    test('should handle multiple concurrent stock reservations', async () => {
        const items = [
            {
                _id: testProduct._id.toString(),
                size: 'M',
                quantity: 1
            }
        ];
        
        // Simulate 10 concurrent reservations
        const promises = Array(10).fill().map(() => reserveStock(items));
        
        try {
            await Promise.all(promises);
            // This should fail because we only have 15 in stock
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toContain('Insufficient stock');
        }
        
        // Verify final stock is not negative
        const updatedProduct = await productModel.findById(testProduct._id);
        const mSize = updatedProduct.sizes.find(s => s.size === 'M');
        expect(mSize.stock).toBeGreaterThanOrEqual(0);
    });
    
    test('should handle concurrent cart additions', async () => {
        const promises = Array(5).fill().map((_, index) => {
            const req = createMockReq({
                userId: testUser._id.toString(),
                itemId: testProduct._id.toString(),
                size: 'S',
                quantity: 1
            });
            const res = createMockRes();
            return addToCart(req, res);
        });
        
        await Promise.all(promises);
        
        // Verify final cart state
        const updatedUser = await userModel.findById(testUser._id);
        const cartQuantity = updatedUser.cartData[testProduct._id.toString()]['S'];
        expect(cartQuantity).toBe(5);
        
        // Verify stock was reduced correctly
        const updatedProduct = await productModel.findById(testProduct._id);
        const sSize = updatedProduct.sizes.find(s => s.size === 'S');
        expect(sSize.stock).toBe(5); // 10 - 5
    });
}); 