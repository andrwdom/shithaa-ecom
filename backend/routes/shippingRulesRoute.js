import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import {
    getAllShippingRules,
    getShippingRuleByCategory,
    createShippingRule,
    updateShippingRule,
    deleteShippingRule,
    calculateShippingWithRules,
    seedDefaultShippingRules
} from '../controllers/shippingRulesController.js';

const shippingRulesRouter = express.Router();

// Public routes
shippingRulesRouter.post('/calculate', calculateShippingWithRules);

// Admin routes (protected)
shippingRulesRouter.get('/', adminAuth, getAllShippingRules);
shippingRulesRouter.get('/:category', adminAuth, getShippingRuleByCategory);
shippingRulesRouter.post('/', adminAuth, createShippingRule);
shippingRulesRouter.put('/:category', adminAuth, updateShippingRule);
shippingRulesRouter.delete('/:category', adminAuth, deleteShippingRule);
shippingRulesRouter.post('/seed/default', adminAuth, seedDefaultShippingRules);

export default shippingRulesRouter; 