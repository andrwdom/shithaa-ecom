# Shithaa Backend API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
All protected endpoints require JWT token in the request header:
```
headers: {
  "token": "your-jwt-token-here"
}
```

## Response Format
All endpoints return standardized responses:

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 5,
  "message": "Success message"
}
```

---

## 1. Authentication Endpoints

### POST /api/user/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "jwt_token_here"
  },
  "message": "Registration successful"
}
```

### POST /api/user/login
Login user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "jwt_token_here"
  },
  "message": "Login successful"
}
```

### GET /api/auth/profile
Get current user profile (Protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile fetched successfully"
}
```

### PUT /api/auth/profile
Update user profile (Protected).

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+1234567890",
  "email": "john.updated@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "phone": "+1234567890",
    "role": "user"
  },
  "message": "Profile updated successfully"
}
```

---

## 2. Product Endpoints

### GET /api/products
Get all products with filtering, pagination, and sorting.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `categorySlug` (string): Filter by category slug
- `search` (string): Search in name and description
- `isNewArrival` (boolean): Filter new arrivals
- `isBestSeller` (boolean): Filter best sellers
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort by field (createdAt, rating, price, name, date)

**Example Request:**
```
GET /api/products?page=1&limit=10&category=shirts&sortBy=price&minPrice=100&maxPrice=500
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "name": "Cotton T-Shirt",
      "price": 299,
      "originalPrice": 399,
      "images": ["https://cloudinary.com/image1.jpg"],
      "category": "Shirts",
      "categorySlug": "shirts",
      "description": "Comfortable cotton t-shirt",
      "sizes": [
        { "size": "S", "stock": 10 },
        { "size": "M", "stock": 15 }
      ],
      "features": ["100% Cotton", "Machine washable"],
      "rating": 4.5,
      "reviews": 25,
      "isNewArrival": true,
      "isBestSeller": false,
      "inStock": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 5,
  "message": "Products fetched successfully"
}
```

### GET /api/products/:id
Get a single product by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "name": "Cotton T-Shirt",
    "price": 299,
    "originalPrice": 399,
    "images": ["https://cloudinary.com/image1.jpg"],
    "category": "Shirts",
    "categorySlug": "shirts",
    "description": "Comfortable cotton t-shirt",
    "sizes": [
      { "size": "S", "stock": 10 },
      { "size": "M", "stock": 15 }
    ],
    "features": ["100% Cotton", "Machine washable"],
    "rating": 4.5,
    "reviews": 25,
    "isNewArrival": true,
    "isBestSeller": false,
    "inStock": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Product fetched successfully"
}
```

---

## 3. Category Endpoints

### GET /api/categories
Get all categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "category_id",
      "name": "Shirts",
      "slug": "shirts",
      "description": "All types of shirts",
      "image": "https://cloudinary.com/category-image.jpg",
      "productCount": 25,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Categories fetched successfully"
}
```

### GET /api/categories/:slug
Get a single category by slug.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "name": "Shirts",
    "slug": "shirts",
    "description": "All types of shirts",
    "image": "https://cloudinary.com/category-image.jpg",
    "productCount": 25,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Category fetched successfully"
}
```

### GET /api/categories/:slug/products
Get products by category slug with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Sort by field (createdAt, rating, price, name, date)
- `search` (string): Search in name and description
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "name": "Cotton T-Shirt",
      "price": 299,
      "images": ["https://cloudinary.com/image1.jpg"],
      "category": "Shirts",
      "categorySlug": "shirts",
      "description": "Comfortable cotton t-shirt",
      "sizes": [
        { "size": "S", "stock": 10 },
        { "size": "M", "stock": 15 }
      ],
      "features": ["100% Cotton", "Machine washable"],
      "rating": 4.5,
      "reviews": 25,
      "isNewArrival": true,
      "isBestSeller": false,
      "inStock": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3,
  "message": "Products fetched successfully"
}
```

---

## 4. Order Endpoints

### GET /api/orders/user
Get orders for the logged-in user (Protected).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "userId": "user_id",
      "items": [
        {
          "name": "Cotton T-Shirt",
          "price": 299,
          "quantity": 2,
          "size": "M",
          "image": ["https://cloudinary.com/image1.jpg"]
        }
      ],
      "address": {
        "firstName": "John",
        "lastName": "Doe",
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipcode": "10001",
        "country": "USA",
        "phone": "+1234567890"
      },
      "amount": 598,
      "status": "Order Placed",
      "payment": false,
      "paymentMethod": "COD",
      "date": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "message": "Orders fetched successfully"
}
```

### GET /api/orders/:id
Get a single order by ID (Protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "userId": "user_id",
    "items": [
      {
        "name": "Cotton T-Shirt",
        "price": 299,
        "quantity": 2,
        "size": "M",
        "image": ["https://cloudinary.com/image1.jpg"]
      }
    ],
    "address": {
      "firstName": "John",
      "lastName": "Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipcode": "10001",
      "country": "USA",
      "phone": "+1234567890"
    },
    "amount": 598,
    "status": "Order Placed",
    "payment": false,
    "paymentMethod": "COD",
    "date": "2024-01-01T00:00:00.000Z"
  },
  "message": "Order fetched successfully"
}
```

### POST /api/orders
Create a new order (Protected).

**Request Body:**
```json
{
  "items": [
    {
      "_id": "product_id",
      "name": "Cotton T-Shirt",
      "price": 299,
      "quantity": 2,
      "size": "M",
      "image": ["https://cloudinary.com/image1.jpg"]
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipcode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "paymentMethod": "COD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "userId": "user_id",
    "items": [...],
    "address": {...},
    "amount": 598,
    "status": "Order Placed",
    "payment": false,
    "paymentMethod": "COD",
    "date": "2024-01-01T00:00:00.000Z"
  },
  "message": "Order created successfully"
}
```

---

## 5. Cart Endpoints

### POST /api/cart/get
Get user cart (Protected).

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "cartData": {
    "product_id_1": {
      "S": 2,
      "M": 1
    }
  }
}
```

### POST /api/cart/add
Add item to cart (Protected).

**Request Body:**
```json
{
  "userId": "user_id",
  "itemId": "product_id",
  "size": "M"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added To Cart"
}
```

### POST /api/cart/update
Update cart item quantity (Protected).

**Request Body:**
```json
{
  "userId": "user_id",
  "itemId": "product_id",
  "size": "M",
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart Updated"
}
```

---

## 6. Contact Endpoint

### POST /api/contact
Submit contact form.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "General Inquiry",
  "message": "I have a question about your products."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact form submitted successfully"
}
```

---

## 7. Coupon Endpoints

### POST /api/coupons/validate
Validate a coupon code.

**Request Body:**
```json
{
  "code": "SAVE20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discountPercentage": 20
  },
  "message": "Coupon is valid"
}
```

---

## 8. Carousel/Banner Endpoints

### GET /api/carousel
Get all active carousel banners.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "banner_id",
      "image": "https://cloudinary.com/banner1.jpg",
      "title": "Summer Sale",
      "description": "Up to 50% off on summer collection",
      "sectionId": "home",
      "isActive": true,
      "order": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Banners fetched successfully"
}
```

---

## Error Codes

- `400` - Bad Request (Missing or invalid parameters)
- `401` - Unauthorized (Invalid or missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource not found)
- `500` - Internal Server Error

## Environment Variables Required

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/jjtex
JWT_SECRET=your-jwt-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin-password
NODE_ENV=development

# Emergency Features Configuration
# 🚨 CRITICAL: Emergency deduction is DISABLED by default for safety
# Only enable in extreme cases where payment succeeded but stock confirmation failed
# ENABLE_EMERGENCY_DEDUCTION=false
```