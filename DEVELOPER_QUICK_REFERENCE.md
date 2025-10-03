# Shithaa Developer Quick Reference

## 🚀 Quick Start Commands

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run optimize-images  # Optimize images
npm run performance:audit  # Run performance audit
```

### Backend (Express)
```bash
cd backend
npm install
npm run dev          # Start development server (http://localhost:4000)
npm start            # Start production server
```

### Admin Panel (React/Vite)
```bash
cd admin
npm install
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📁 Key File Locations

### Frontend
```
frontend/
├── app/layout.tsx              # Root layout & SEO metadata
├── app/page.tsx                # Homepage
├── app/globals.css             # Global styles
├── components/                 # Reusable components
│   ├── navbar.tsx             # Navigation
│   ├── cart-context.tsx       # Shopping cart state
│   ├── wishlist-context.tsx   # Wishlist state
│   └── ui/                    # UI components
├── lib/                       # Utilities
│   ├── firebase.ts            # Firebase config
│   └── utils.ts               # Helper functions
└── types/                     # TypeScript types
```

### Backend
```
backend/
├── server.js                   # Main server file
├── models/                     # Database models
│   ├── productModel.js        # Product schema
│   ├── orderModel.js          # Order schema
│   └── User.js                # User schema
├── controllers/                # Business logic
│   ├── productController.js   # Product operations
│   ├── orderController.js     # Order operations
│   └── userController.js      # User operations
├── routes/                     # API routes
├── middleware/                 # Middleware
│   ├── auth.js                # JWT authentication
│   └── multer.js              # File upload
└── utils/                      # Utilities
    └── response.js            # Standardized responses
```

### Admin Panel
```
admin/
├── src/
│   ├── App.jsx                # Main app component
│   ├── components/             # Admin components
│   │   ├── Login.jsx          # Admin login
│   │   ├── Navbar.jsx         # Admin navigation
│   │   └── Sidebar.jsx        # Admin sidebar
│   └── pages/                 # Admin pages
│       ├── List.jsx           # Product listing
│       ├── Add.jsx            # Add products
│       └── Orders.jsx         # Order management
```

## 🔧 Common Development Patterns

### Frontend State Management
```typescript
// Context pattern for global state
const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  
  const addToCart = useCallback((product: Product, size: string, quantity: number) => {
    // Implementation
  }, [])
  
  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  )
}
```

### Backend API Response Pattern
```javascript
// Standardized API responses
import { successResponse, errorResponse } from '../utils/response.js'

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find()
    return successResponse(res, products, 'Products retrieved successfully')
  } catch (error) {
    return errorResponse(res, error.message)
  }
}
```

### Database Query Pattern
```javascript
// Efficient pagination and filtering
const getProducts = async (req, res) => {
  const { page = 1, limit = 12, category, search } = req.query
  
  const query = {}
  if (category) query.category = category
  if (search) query.$text = { $search: search }
  
  const products = await Product.find(query)
    .populate('category')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec()
  
  const total = await Product.countDocuments(query)
  
  return successResponse(res, {
    products,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  })
}
```

## 🔒 Authentication Patterns

### Frontend Auth (Firebase)
```typescript
// Firebase authentication
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

const auth = getAuth()
const provider = new GoogleAuthProvider()

const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    // Handle successful login
  } catch (error) {
    // Handle error
  }
}
```

### Backend Auth (JWT)
```javascript
// JWT middleware
import jwt from 'jsonwebtoken'

export const auth = async (req, res, next) => {
  try {
    const token = req.header('token')
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}
```

## 🎨 UI Component Patterns

### Radix UI Integration
```typescript
// Button component with variants
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Responsive Design
```typescript
// Mobile detection hook
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}
```

## 📊 Performance Optimization

### Image Optimization
```typescript
// Next.js Image component
import Image from 'next/image'

<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={500}
  placeholder="blur"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isPriority}
/>
```

### Code Splitting
```typescript
// Dynamic imports
import dynamic from 'next/dynamic'

const ProductPage = dynamic(() => import('./ProductPage'), {
  loading: () => <ProductPageSkeleton />
})
```

## 🔧 Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=https://shithaa.in
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
```

### Backend (.env)
```bash
MONGODB_URI=mongodb://localhost:27017/shitha
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Emergency Features Configuration
# 🚨 CRITICAL: Emergency deduction is DISABLED by default for safety
# Only enable in extreme cases where payment succeeded but stock confirmation failed
# ENABLE_EMERGENCY_DEDUCTION=false
```

## 🚀 Deployment Commands

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy .next folder to Vercel
```

### Backend (Railway/Render)
```bash
cd backend
npm run build
# Deploy with environment variables
```

### Admin Panel
```bash
cd admin
npm run build
# Deploy dist folder
```

## 🐛 Debugging Commands

### Frontend Debugging
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Run performance audit
npm run performance:audit

# Analyze bundle size
npm run analyze
```

### Backend Debugging
```bash
# Check MongoDB connection
node -e "console.log(require('mongoose').connection.readyState)"

# Test API endpoints
curl http://localhost:4000/api/products

# Check logs
pm2 logs shithaa-backend
```

## 📝 Common Tasks

### Add New Product
1. **Backend**: Add product via admin panel or API
2. **Frontend**: Product will appear in catalog automatically
3. **Admin**: Use admin panel to manage product details

### Update Order Status
1. **Admin Panel**: Go to Orders page
2. **Backend**: Order status updates via API
3. **Frontend**: User sees updated status in account

### Add New Category
1. **Backend**: Add category via admin panel
2. **Frontend**: Category appears in navigation automatically
3. **SEO**: Category pages are auto-generated

### Payment Integration
1. **Razorpay**: Primary payment gateway
2. **PhonePe**: Alternative payment option
3. **Webhooks**: Handle payment confirmations

## 🔍 API Endpoints Quick Reference

### Products
```bash
GET    /api/products              # Get all products
GET    /api/products/:id          # Get single product
POST   /api/products              # Create product (admin)
PUT    /api/products/:id          # Update product (admin)
DELETE /api/products/:id          # Delete product (admin)
```

### Orders
```bash
GET    /api/orders                # Get user orders
POST   /api/orders                # Create order
PUT    /api/orders/:id            # Update order status (admin)
GET    /api/orders/:id            # Get order details
```

### Users
```bash
POST   /api/user/register         # Register user
POST   /api/user/login            # Login user
GET    /api/user/profile          # Get user profile
PUT    /api/user/profile          # Update profile
```

### Cart
```bash
GET    /api/cart                  # Get cart items
POST   /api/cart/add              # Add to cart
DELETE /api/cart/:id              # Remove from cart
PUT    /api/cart/:id              # Update cart item
```

## 📞 Support Contacts

- **Technical Issues**: Check GitHub issues
- **Business Inquiries**: info.shitha@gmail.com
- **Phone**: 8148480720


---

*This quick reference guide helps developers navigate the Shithaa codebase efficiently.* 