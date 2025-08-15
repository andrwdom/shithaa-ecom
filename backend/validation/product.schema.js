import { z } from 'zod';

// SECURITY: Product request validation schemas
export const createProductSchema = z.object({
  body: z.object({
    customId: z.string().min(1, 'Custom ID is required'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
    price: z.number().positive('Price must be positive'),
    category: z.string().min(1, 'Category is required'),
    subCategory: z.string().optional(),
    type: z.string().optional(),
    sizes: z.string().refine(val => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }, 'Sizes must be a valid JSON array'),
    bestseller: z.boolean().optional(),
    originalPrice: z.number().positive().optional(),
    categorySlug: z.string().optional(),
    features: z.string().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    availableSizes: z.string().optional(),
    stock: z.number().min(0).optional(),
    sleeveType: z.string().optional()
  })
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required')
  }),
  body: z.object({
    customId: z.string().min(1, 'Custom ID is required').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name too long').optional(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long').optional(),
    price: z.number().positive('Price must be positive').optional(),
    category: z.string().min(1, 'Category is required').optional(),
    subCategory: z.string().optional(),
    type: z.string().optional(),
    sizes: z.string().optional(),
    bestseller: z.boolean().optional(),
    originalPrice: z.number().positive().optional(),
    categorySlug: z.string().optional(),
    features: z.string().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    availableSizes: z.string().optional(),
    stock: z.number().min(0).optional(),
    sleeveType: z.string().optional()
  })
});

export const getProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required')
  })
});

export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required')
  })
}); 