# Shithaa Maternity Wear - Technical Analysis

## 🏗️ Architecture Deep Dive

### Microservices Architecture
The Shithaa platform follows a **microservices architecture** with three distinct applications:

1. **Frontend (Next.js 14)** - Customer-facing e-commerce website
2. **Backend (Express.js)** - REST API server  
3. **Admin Panel (React/Vite)** - Content management system

### Data Flow Architecture
```
User Request → Frontend (Next.js) → Backend API (Express) → MongoDB
                ↓
            Admin Panel (React) → Backend API (Express) → MongoDB
```

## 🔧 Frontend Technical Analysis

### Next.js 14 App Router Implementation

#### Core Features
- **App Router**: Modern file-based routing system
- **Server Components**: Default server-side rendering for performance
- **Client Components**: Strategic use of `"use client"` for interactivity
- **Image Optimization**: Next.js Image component with automatic optimization
- **Font Optimization**: Google Fonts with `display: swap`

#### Key Components Analysis

##### Layout System (`/app/layout.tsx`)
```typescript
// Comprehensive SEO metadata
export const metadata: Metadata = {
  title: { default: "Shithaa - Elegant Maternity & Feeding Wear", template: "%s | Shithaa" },
  description: "Discover elegant maternity wear...",
  keywords: ["maternity wear", "feeding wear", ...],
  openGraph: { /* Social media optimization */ },
  twitter: { /* Twitter Card optimization */ },
  robots: { /* Search engine directives */ }
}
```

##### State Management Pattern
```typescript
// Context-based state management
// cart-context.tsx, wishlist-context.tsx, auth-context.tsx
const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  // Cart operations with localStorage persistence
  const addToCart = useCallback((product: Product, size: string, quantity: number) => {
    // Implementation with optimistic updates
  }, [])
}
```

##### Performance Optimizations

**Image Optimization**:
```typescript
// optimized-image.tsx
import Image from 'next/image'

export const OptimizedImage = ({ src, alt, ...props }: ImageProps) => {
  return (
    <Image
      src={src}
      alt={alt}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  )
}
```

**Component Optimization**:
```typescript
// product-card-optimized.tsx
import { memo } from 'react'

const ProductCard = memo(({ product }: { product: Product }) => {
  // Memoized component for performance
  return (
    <div className="product-card">
      {/* Optimized rendering */}
    </div>
  )
})
```

### UI Component Architecture

#### Radix UI Integration
```typescript
// ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

#### Responsive Design Pattern
```typescript
// use-mobile.tsx
import { useEffect, useState } from 'react'

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}
```

## 🔧 Backend Technical Analysis

### Express.js Server Architecture

#### Server Configuration (`server.js`)
```javascript
// Modern ES modules setup
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = process.env.PORT || 4000

// Security middleware
app.set('trust proxy', 1)

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for local development
    return req.headers.origin?.includes('localhost') || req.method === 'OPTIONS'
  }
})

app.use(limiter)
```

#### Database Models Pattern

**Product Model** (`models/productModel.js`):
```javascript
import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  images: [{ type: String }],
  sizes: [{ type: String }],
  colors: [{ type: String }],
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  slug: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ category: 1 })
productSchema.index({ featured: 1 })
```

**Order Model** (`models/orderModel.js`):
```javascript
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  paymentMethod: String,
  razorpayOrderId: String,
  razorpayPaymentId: String
}, {
  timestamps: true
})
```

#### Controller Pattern

**Product Controller** (`controllers/productController.js`):
```javascript
// Standardized response pattern
import { successResponse, errorResponse } from '../utils/response.js'

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search, sort } = req.query
    
    // Build query
    const query = {}
    if (category) query.category = category
    if (search) {
      query.$text = { $search: search }
    }
    
    // Build sort
    const sortOptions = {}
    if (sort === 'price-asc') sortOptions.price = 1
    if (sort === 'price-desc') sortOptions.price = -1
    if (sort === 'newest') sortOptions.createdAt = -1
    
    const products = await Product.find(query)
      .populate('category')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()
    
    const total = await Product.countDocuments(query)
    
    return successResponse(res, {
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, 'Products retrieved successfully')
    
  } catch (error) {
    return errorResponse(res, error.message)
  }
}
```

#### Authentication Middleware

**JWT Authentication** (`middleware/auth.js`):
```javascript
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const auth = async (req, res, next) => {
  try {
    const token = req.header('token')
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    })
  }
}
```

### Payment Integration

**Razorpay Integration** (`controllers/paymentController.js`):
```javascript
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      payment_capture: 1
    }
    
    const order = await razorpay.orders.create(options)
    
    return successResponse(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    }, 'Order created successfully')
    
  } catch (error) {
    return errorResponse(res, error.message)
  }
}
```

## 🔧 Admin Panel Technical Analysis

### React + Vite Architecture

#### Component Structure
```javascript
// App.jsx - Main application structure
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <List />
                  </ProtectedRoute>
                } />
                {/* More protected routes */}
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}
```

#### State Management Pattern
```javascript
// AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('adminToken')
    if (token) {
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])
  
  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/user/admin/login', credentials)
      const { token, user } = response.data.data
      
      localStorage.setItem('adminToken', token)
      setUser(user)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.response?.data?.message }
    }
  }
  
  const logout = () => {
    localStorage.removeItem('adminToken')
    setUser(null)
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

## 🔒 Security Analysis

### Authentication & Authorization

**Multi-layer Authentication**:
1. **Frontend**: Firebase Auth for customer authentication
2. **Backend**: JWT tokens for API authentication
3. **Admin**: Custom JWT-based admin authentication

**Security Headers**:
```javascript
// server.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})
```

### Rate Limiting Strategy
```javascript
// Different rate limits for different endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 attempts per hour
  message: 'Too many login attempts, please try again later'
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
})

app.use('/api/user/login', authLimiter)
app.use('/api/user/admin', authLimiter)
app.use('/api', apiLimiter)
```

## 📊 Performance Analysis

### Frontend Performance Optimizations

**Code Splitting**:
```javascript
// Dynamic imports for route-based code splitting
const ProductPage = dynamic(() => import('./ProductPage'), {
  loading: () => <ProductPageSkeleton />
})

const CheckoutPage = dynamic(() => import('./CheckoutPage'), {
  loading: () => <CheckoutSkeleton />
})
```

**Image Optimization**:
```javascript
// Next.js Image component with optimization
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={500}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isPriority}
/>
```

**Bundle Optimization**:
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react']
  },
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/webp', 'image/avif']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}
```

### Backend Performance Optimizations

**Database Indexing**:
```javascript
// Strategic indexes for common queries
productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ category: 1, featured: 1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
```

**Query Optimization**:
```javascript
// Efficient pagination and population
const products = await Product.find(query)
  .populate('category', 'name slug')
  .select('name price images category featured')
  .sort(sortOptions)
  .limit(limit)
  .skip((page - 1) * limit)
  .lean() // Convert to plain objects for better performance
```

## 🔧 Development Patterns

### Error Handling Pattern
```javascript
// Standardized error handling
export const errorHandler = (error, req, res, next) => {
  console.error('Error:', error)
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => err.message)
    })
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    })
  }
  
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  })
}
```

### API Response Pattern
```javascript
// utils/response.js
export const successResponse = (res, data, message = 'Success') => {
  return res.status(200).json({
    success: true,
    data,
    message
  })
}

export const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message
  })
}
```

### Validation Pattern
```javascript
// Input validation using validator library
import validator from 'validator'

export const validateProduct = (req, res, next) => {
  const { name, price, description } = req.body
  
  if (!name || !validator.isLength(name, { min: 2, max: 100 })) {
    return errorResponse(res, 'Product name must be between 2 and 100 characters')
  }
  
  if (!price || !validator.isNumeric(price.toString()) || price <= 0) {
    return errorResponse(res, 'Price must be a positive number')
  }
  
  if (!description || !validator.isLength(description, { min: 10, max: 1000 })) {
    return errorResponse(res, 'Description must be between 10 and 1000 characters')
  }
  
  next()
}
```

## 📈 Monitoring & Analytics

### Performance Monitoring
```javascript
// Performance monitoring component
export const PerformanceMonitor = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`${entry.name}: ${entry.value}`)
          // Send to analytics service
        }
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    }
  }, [])
  
  return null
}
```

### Error Tracking
```javascript
// Error boundary for React components
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

## 🚀 Deployment Architecture

### Production Setup
```javascript
// ecosystem.config.js - PM2 configuration
module.exports = {
  apps: [{
    name: 'shithaa-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### Nginx Configuration
```nginx
# nginx-config/shithaa.conf
server {
    listen 80;
    server_name shithaa.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shithaa.in;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

*This technical analysis provides a comprehensive overview of the Shithaa platform's architecture, implementation patterns, and technical decisions.* 