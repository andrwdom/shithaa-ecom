import express from 'express';
import {
    calculateShippingWithRules
} from '../controllers/shippingRulesController.js';

const shippingRulesRouter = express.Router();

// Public routes only
shippingRulesRouter.post('/calculate', calculateShippingWithRules);

export default shippingRulesRouter; 