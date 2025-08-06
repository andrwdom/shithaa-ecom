# Shithaa Maternity E-commerce Platform - Codebase Index

## 🏗️ Project Overview

**Shithaa** is a modern, production-ready e-commerce platform for premium maternity wear and feeding essentials. The platform consists of three main applications:

1. **Frontend** (Next.js 14) - Customer-facing e-commerce website
2. **Backend** (Node.js/Express) - REST API server
3. **Admin Panel** (React/Vite) - Content management system

## 📁 Project Structure

```
shitha-maternity2/
├── frontend/                 # Next.js 14 Frontend (Customer Site)
├── backend/                  # Express.js API Server
├── admin/                    # React Admin Panel (Vite)
└── nginx-config/            # Nginx configuration files
```

## 🎯 Frontend (Next.js 14) - `/frontend`

### Core Architecture
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: React Context (Cart, Wishlist, Auth)
- **Authentication**: Firebase Auth
- **Payments**: Razorpay integration
- **Performance**: Optimized images, lazy loading, PWA support

### Key Directories & Files

#### `/app` - App Router Pages
- `layout.tsx` - Root layout with SEO metadata, fonts, providers
- `page.tsx` - Homepage with hero, carousel, product sliders
- `globals.css` - Global styles and Tailwind configuration
- `providers.tsx` - Context providers (Auth, Cart, Wishlist, Theme)

#### `/app` Subdirectories
- `/about/` - About page with company information
- `/account/` - User account management and order history
- `/checkout/` - Complete checkout flow with payment integration
- `/collections/[categorySlug]/` - Category pages with product filtering
- `/contact/` - Contact form and company details
- `/product/[productId]/` - Individual product pages
- `/wishlist/` - User wishlist management
- `/payment/phonepe/callback/` - Payment gateway callbacks
- `/order-success/` - Order confirmation page
- `/confirmation/` - Order confirmation details
- `/privacy-policy/`, `/terms/`, `/shipping-info/`, `/return-policy/` - Legal pages

#### `/components` - Reusable Components
- **UI Components**: `/ui/` - Radix UI components (buttons, forms, modals, etc.)
- **Layout**: `navbar.tsx`, `footer.tsx`, `layout-client.tsx`
- **Product**: `product-card.tsx`, `product-page.tsx`, `product-slider.tsx`
- **Cart**: `cart-sidebar.tsx`, `cart-context.tsx`, `quantity-selector.tsx`
- **Carousel**: `banner-carousel.tsx`, `image-carousel.tsx`, `fallback-carousel.tsx`
- **Auth**: `/auth/` - Authentication components
- **Performance**: `performance-monitor.tsx`, `error-boundary.tsx`
- **Category**: `category-sidebar.tsx`, `category-strip.tsx`, `category-cards.tsx`

#### `/hooks` - Custom React Hooks
- `use-mobile.tsx` - Mobile detection
- `use-toast.ts` - Toast notifications
- `useCarousel.ts` - Carousel functionality

#### `/lib` - Utility Libraries
- `api-health.ts` - API health monitoring
- `firebase.ts` - Firebase configuration
- `image-utils.ts` - Image optimization utilities
- `server-utils.ts` - Server-side utilities
- `utils.ts` - General utility functions

#### `/scripts` - Build & Performance Tools
- `build-optimized.js` - Optimized build process
- `performance-audit.js` - Performance monitoring
- `optimize-images.js` - Image optimization
- `generate-webp.js` - WebP conversion

#### `/public` - Static Assets
- Product images and logos
- Placeholder images
- Manifest and PWA files

### Key Features
- **SEO Optimized**: Comprehensive metadata, structured data, sitemap
- **Performance**: Image optimization, lazy loading, code splitting
- **Mobile First**: Responsive design with touch-friendly interface
- **PWA Ready**: Service worker, manifest, offline support
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## 🔧 Backend (Express.js) - `/backend`

### Core Architecture
- **Framework**: Express.js with ES modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Firebase Admin
- **Payments**: Razorpay + PhonePe integration
- **File Upload**: Multer with Sharp image processing
- **Security**: Rate limiting, CORS, input validation

### Key Directories & Files

#### `/models` - Database Models
- `productModel.js` - Product schema with sizes, categories, inventory
- `orderModel.js` - Order schema with shipping, payment, refund tracking
- `User.js` - User authentication and profile data
- `Category.js` - Product categories and slugs
- `Coupon.js` - Discount codes and promotions
- `CarouselBanner.js` - Homepage banner management
- `Contact.js` - Contact form submissions
- `Wishlist.js` - User wishlist items
- `counterModel.js` - Auto-increment counters

#### `/routes` - API Endpoints
- `productRoute.js` - Product CRUD operations
- `orderRoute.js` - Order management and tracking
- `userRoute.js` - User authentication and profiles
- `cartRoute.js` - Shopping cart operations
- `paymentRoute.js` - Payment processing (Razorpay/PhonePe)
- `couponRoutes.js` - Discount code management
- `categoryRoute.js` - Category management
- `carouselRoutes.js` - Banner carousel management
- `contactRoute.js` - Contact form handling
- `wishlistRoutes.js` - Wishlist operations

#### `/controllers` - Business Logic
- `productController.js` - Product operations
- `orderController.js` - Order processing and management
- `userController.js` - User authentication and management
- `paymentController.js` - Payment gateway integration
- `cartController.js` - Cart operations
- `couponController.js` - Discount management
- `categoryController.js` - Category operations
- `carouselController.js` - Banner management
- `contactController.js` - Contact form processing
- `wishlistController.js` - Wishlist operations
- `refundController.js` - Refund processing
- `webhookController.js` - Payment webhook handling

#### `/middleware` - Express Middleware
- `auth.js` - JWT authentication
- `adminAuth.js` - Admin-only route protection
- `multer.js` - File upload handling

#### `/config` - Configuration
- `mongodb.js` - Database connection setup

#### `/utils` - Utility Functions
- `response.js` - Standardized API responses
- `imageOptimizer.js` - Image processing utilities
- `invoiceGenerator.js` - PDF invoice generation

#### `/scripts` - Database Tools
- Migration scripts for data consistency
- Seeding scripts for initial data
- Order reconciliation tools

### Key Features
- **RESTful API**: Standard HTTP methods and status codes
- **Rate Limiting**: Protection against abuse
- **File Upload**: Image processing with Sharp
- **Payment Integration**: Multiple payment gateways
- **Order Management**: Complete order lifecycle
- **Inventory Management**: Real-time stock tracking
- **Admin Authentication**: Secure admin access

## 🛠️ Admin Panel (React/Vite) - `/admin`

### Core Architecture
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM
- **UI**: Tailwind CSS + custom components
- **State Management**: React Context + local state
- **HTTP Client**: Axios for API calls

### Key Components
- `App.jsx` - Main application component
- `Login.jsx` - Admin authentication
- `Navbar.jsx` - Navigation header
- `Sidebar.jsx` - Admin menu sidebar
- `ProtectedRoute.jsx` - Route protection

### Pages
- `Add.jsx` - Add new products
- `List.jsx` - Product listing and management
- `EditProduct.jsx` - Product editing
- `Orders.jsx` - Order management
- `CarouselManagement.jsx` - Banner carousel management
- `CouponManagement.jsx` - Discount code management

### Features
- **Product Management**: CRUD operations for products
- **Order Management**: View and update order status
- **Inventory Control**: Stock management
- **Content Management**: Banner carousel and promotions
- **User Management**: Customer data access

## 🔄 Data Flow Architecture

### Frontend → Backend Communication
1. **API Calls**: Frontend makes HTTP requests to backend endpoints
2. **Authentication**: JWT tokens for user sessions
3. **Real-time Updates**: Polling for order status changes
4. **File Upload**: Multipart form data for images

### Database Schema Relationships
- **Users** → **Orders** (one-to-many)
- **Products** → **Order Items** (one-to-many)
- **Categories** → **Products** (one-to-many)
- **Users** → **Wishlist** (one-to-many)

### Payment Flow
1. **Cart** → **Checkout** → **Payment Gateway**
2. **Payment Success** → **Order Creation** → **Inventory Update**
3. **Order Confirmation** → **Email Notification**

## 🚀 Deployment Architecture

### Frontend Deployment
- **Platform**: Vercel/Netlify
- **Build**: `npm run build`
- **Environment**: Production-optimized Next.js

### Backend Deployment
- **Platform**: Railway/Render
- **Process**: PM2 ecosystem
- **Database**: MongoDB Atlas

### Nginx Configuration
- **Reverse Proxy**: Routes traffic to frontend/backend
- **SSL**: HTTPS enforcement
- **Static Files**: Optimized serving

## 🔧 Development Workflow

### Local Development
1. **Backend**: `cd backend && npm run dev` (Port 4000)
2. **Frontend**: `cd frontend && npm run dev` (Port 3000)
3. **Admin**: `cd admin && npm run dev` (Port 5173)

### Environment Variables
- **Frontend**: `.env.local` - API URLs, payment keys
- **Backend**: `.env` - Database, JWT, payment secrets
- **Admin**: `.env` - API endpoints

### Database Management
- **Migrations**: Run scripts in `/backend/scripts/`
- **Seeding**: Initial data setup
- **Backups**: Regular MongoDB backups

## 📊 Performance & SEO

### Frontend Optimizations
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Dynamic imports
- **Bundle Analysis**: Webpack bundle analyzer
- **Lighthouse**: Performance monitoring

### SEO Implementation
- **Meta Tags**: Dynamic titles and descriptions
- **Structured Data**: JSON-LD schemas
- **Sitemap**: Dynamic generation
- **Robots.txt**: Search engine directives

### Monitoring
- **Performance**: Lighthouse CI
- **Errors**: Error boundaries and logging
- **Analytics**: Google Analytics integration

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure session management
- **Firebase Auth**: Social login integration
- **Admin Protection**: Role-based access control

### Data Protection
- **Input Validation**: Request sanitization
- **Rate Limiting**: API abuse prevention
- **CORS**: Cross-origin request handling
- **HTTPS**: SSL/TLS encryption

### Payment Security
- **PCI Compliance**: Secure payment processing
- **Webhook Verification**: Payment confirmation
- **Refund Tracking**: Complete audit trail

## 📱 Mobile & PWA Features

### Responsive Design
- **Mobile First**: Touch-friendly interface
- **Breakpoints**: Tailwind responsive classes
- **Performance**: Optimized for mobile networks

### PWA Capabilities
- **Service Worker**: Offline functionality
- **Manifest**: App-like experience
- **Install Prompt**: Add to home screen

## 🎯 Business Logic

### Product Management
- **Categories**: Maternity feeding wear, lounge wear
- **Sizes**: Stock tracking per size
- **Features**: New arrivals, best sellers
- **Inventory**: Real-time stock updates

### Order Processing
- **Status Tracking**: Pending → Confirmed → Shipped → Delivered
- **Payment Status**: Pending → Paid → Refunded
- **Shipping**: Address validation and tracking
- **Notifications**: Email confirmations

### Customer Experience
- **Wishlist**: Save favorite products
- **Cart**: Persistent shopping cart
- **Search**: Product discovery
- **Reviews**: Customer feedback system

## 🔄 API Endpoints Summary

### Products
- `GET /api/products` - List products with filtering
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

### Orders
- `GET /api/orders` - List orders (admin)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order status

### Users
- `POST /api/user/login` - User authentication
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile

### Payments
- `POST /api/payment/create` - Initialize payment
- `POST /api/payment/verify` - Verify payment
- `POST /api/payment/webhook` - Payment webhook

### Cart & Wishlist
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add to cart
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add to wishlist

## 📈 Analytics & Monitoring

### Performance Metrics
- **Core Web Vitals**: LCP, FID, CLS
- **Page Load Times**: Server and client metrics
- **Error Rates**: JavaScript and API errors

### Business Metrics
- **Conversion Rate**: Cart to purchase
- **Revenue Tracking**: Order value analysis
- **User Behavior**: Page views and interactions

## 🚀 Future Enhancements

### Planned Features
- **Multi-language**: Internationalization
- **Advanced Search**: Elasticsearch integration
- **Recommendations**: ML-based product suggestions
- **Live Chat**: Customer support integration
- **Analytics Dashboard**: Business intelligence

### Technical Improvements
- **Microservices**: Service decomposition
- **GraphQL**: Flexible data fetching
- **Real-time**: WebSocket integration
- **CDN**: Global content delivery

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready 