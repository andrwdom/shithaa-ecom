import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ShippingRules from '../models/ShippingRules.js';
import { 
    getAllShippingRules, 
    getShippingRuleByCategory, 
    createShippingRule, 
    updateShippingRule, 
    deleteShippingRule,
    calculateShippingWithRules,
    seedDefaultShippingRules 
} from '../controllers/shippingRulesController.js';

let mongoServer;

// Mock request and response objects
const mockRequest = (body = {}, params = {}) => ({
    body,
    params
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Mock the response utility
jest.mock('../utils/response.js', () => ({
    successResponse: jest.fn((message, data) => ({ success: true, message, data })),
    errorResponse: jest.fn((message, error) => ({ success: false, message, error }))
}));

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await ShippingRules.deleteMany({});
});

describe('Shipping Rules Model Tests', () => {
    test('should create a shipping rule with valid data', async () => {
        const ruleData = {
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([
                    ['1', 39],
                    ['2', 49],
                    ['3', 59],
                    ['4', 69],
                    ['5', 79],
                    ['6', 89],
                    ['7+', 99]
                ]),
                otherStates: new Map([
                    ['1', 49],
                    ['2', 69],
                    ['3', 89],
                    ['4+', 109]
                ])
            }
        };

        const rule = new ShippingRules(ruleData);
        await rule.save();

        expect(rule.category).toBe('maternity-feeding-wear');
        expect(rule.categoryName).toBe('Maternity Feeding Wear');
        expect(rule.isActive).toBe(true);
        expect(rule.rules.tamilNadu.get('1')).toBe(39);
        expect(rule.rules.otherStates.get('4+')).toBe(109);
    });

    test('should calculate shipping cost correctly for Tamil Nadu', async () => {
        const ruleData = {
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([
                    ['1', 39],
                    ['2', 49],
                    ['3', 59],
                    ['4', 69],
                    ['5', 79],
                    ['6', 89],
                    ['7+', 99]
                ]),
                otherStates: new Map([
                    ['1', 49],
                    ['2', 69],
                    ['3', 89],
                    ['4+', 109]
                ])
            }
        };

        const rule = new ShippingRules(ruleData);
        await rule.save();

        const result = await ShippingRules.calculateShipping('maternity-feeding-wear', 3, 'Tamil Nadu');
        
        expect(result.shippingCost).toBe(59);
        expect(result.isFreeShipping).toBe(false);
        expect(result.state).toBe('Tamil Nadu');
    });

    test('should calculate shipping cost correctly for other states', async () => {
        const ruleData = {
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([
                    ['1', 39],
                    ['2', 49],
                    ['3', 59],
                    ['4', 69],
                    ['5', 79],
                    ['6', 89],
                    ['7+', 99]
                ]),
                otherStates: new Map([
                    ['1', 49],
                    ['2', 69],
                    ['3', 89],
                    ['4+', 109]
                ])
            }
        };

        const rule = new ShippingRules(ruleData);
        await rule.save();

        const result = await ShippingRules.calculateShipping('maternity-feeding-wear', 5, 'Maharashtra');
        
        expect(result.shippingCost).toBe(109); // Should use 4+ rule
        expect(result.isFreeShipping).toBe(false);
        expect(result.state).toBe('Other States');
    });

    test('should handle 7+ quantity correctly', async () => {
        const ruleData = {
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([
                    ['1', 39],
                    ['2', 49],
                    ['3', 59],
                    ['4', 69],
                    ['5', 79],
                    ['6', 89],
                    ['7+', 99]
                ]),
                otherStates: new Map([
                    ['1', 49],
                    ['2', 69],
                    ['3', 89],
                    ['4+', 109]
                ])
            }
        };

        const rule = new ShippingRules(ruleData);
        await rule.save();

        const result = await ShippingRules.calculateShipping('maternity-feeding-wear', 10, 'Tamil Nadu');
        
        expect(result.shippingCost).toBe(99);
        expect(result.shippingMessage).toContain('₹99 shipping for 10 items');
    });
});

describe('Shipping Rules Controller Tests', () => {
    test('should get all shipping rules', async () => {
        // Create test rules
        const rule1 = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule1.save();

        const req = mockRequest();
        const res = mockResponse();

        await getAllShippingRules(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Shipping rules retrieved successfully'
            })
        );
    });

    test('should get shipping rule by category', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule.save();

        const req = mockRequest({}, { category: 'maternity-feeding-wear' });
        const res = mockResponse();

        await getShippingRuleByCategory(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Shipping rule retrieved successfully'
            })
        );
    });

    test('should create new shipping rule', async () => {
        const ruleData = {
            category: 'zipless-feeding-lounge-wear',
            categoryName: 'Zipless Feeding Lounge Wear',
            rules: {
                tamilNadu: new Map([['1', 29]]),
                otherStates: new Map([['1', 39]])
            }
        };

        const req = mockRequest(ruleData);
        const res = mockResponse();

        await createShippingRule(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Shipping rule created successfully'
            })
        );
    });

    test('should update existing shipping rule', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule.save();

        const updateData = {
            categoryName: 'Updated Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 45]]),
                otherStates: new Map([['1', 55]])
            }
        };

        const req = mockRequest(updateData, { category: 'maternity-feeding-wear' });
        const res = mockResponse();

        await updateShippingRule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Shipping rule updated successfully'
            })
        );
    });

    test('should delete shipping rule', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule.save();

        const req = mockRequest({}, { category: 'maternity-feeding-wear' });
        const res = mockResponse();

        await deleteShippingRule(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Shipping rule deleted successfully'
            })
        );
    });

    test('should calculate shipping with rules', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([
                    ['1', 39],
                    ['2', 49],
                    ['3', 59],
                    ['4', 69],
                    ['5', 79],
                    ['6', 89],
                    ['7+', 99]
                ]),
                otherStates: new Map([
                    ['1', 49],
                    ['2', 69],
                    ['3', 89],
                    ['4+', 109]
                ])
            }
        });
        await rule.save();

        const req = mockRequest({
            items: [
                { categorySlug: 'maternity-feeding-wear', quantity: 3 }
            ],
            shippingInfo: { state: 'Tamil Nadu' }
        });
        const res = mockResponse();

        await calculateShippingWithRules(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    shippingCost: 59,
                    isFreeShipping: false
                })
            })
        );
    });

    test('should seed default shipping rules', async () => {
        const req = mockRequest();
        const res = mockResponse();

        await seedDefaultShippingRules(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Default shipping rules seeded successfully'
            })
        );

        // Verify rules were created
        const rules = await ShippingRules.find();
        expect(rules.length).toBeGreaterThan(0);
        
        const maternityRule = rules.find(r => r.category === 'maternity-feeding-wear');
        expect(maternityRule).toBeDefined();
        expect(maternityRule.rules.tamilNadu.get('1')).toBe(39);
        expect(maternityRule.rules.otherStates.get('1')).toBe(49);
    });
});

describe('Shipping Rules Edge Cases', () => {
    test('should handle non-existent category gracefully', async () => {
        const result = await ShippingRules.calculateShipping('non-existent-category', 1, 'Tamil Nadu');
        expect(result).toBeNull();
    });

    test('should handle inactive rules', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            isActive: false,
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule.save();

        const result = await ShippingRules.calculateShipping('maternity-feeding-wear', 1, 'Tamil Nadu');
        expect(result).toBeNull();
    });

    test('should handle case-insensitive state matching', async () => {
        const rule = new ShippingRules({
            category: 'maternity-feeding-wear',
            categoryName: 'Maternity Feeding Wear',
            rules: {
                tamilNadu: new Map([['1', 39]]),
                otherStates: new Map([['1', 49]])
            }
        });
        await rule.save();

        const result = await ShippingRules.calculateShipping('maternity-feeding-wear', 1, 'TAMIL NADU');
        expect(result.state).toBe('Tamil Nadu');
    });
}); 