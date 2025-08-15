import { z } from 'zod';

// SECURITY: Centralized validation wrapper for all API requests
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request data against schema
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      // Attach validated data to request
      req.validated = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation processing error'
      });
    }
  };
};

// Common validation schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => parseInt(val) || 1),
    limit: z.string().optional().transform(val => parseInt(val) || 10),
    search: z.string().optional(),
    sort: z.string().optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required')
  })
});

export const emailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

// Export Zod for use in other files
export { z }; 