# Shithaa Maternity Wear - Codebase Index

## 📋 Project Overview

**Shithaa** is a modern, production-ready e-commerce platform for premium maternity wear and feeding essentials. The platform is built with a microservices architecture consisting of three main applications:

1. **Frontend** (Next.js 14) - Customer-facing e-commerce website
2. **Backend** (Node.js/Express) - REST API server
3. **Admin Panel** (React/Vite) - Content management system

## 🏗️ Architecture Overview

```
shitha-maternity2/
├── frontend/          # Next.js 14 customer website
├── backend/           # Express.js API server
├── admin/            # React admin panel
├── nginx-config/     # Production deployment config
└── scripts/          # Utility scripts
```

## 🚀 Technology Stack

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **UI Components**: Radix UI primitives
- **State Management**: React Context + Hooks
- **Authentication**: Firebase Auth
- **Payments**: Razorpay integration
- **Animations**: Framer Motion
- **Performance**: React Server Components, Image optimization

### Backend (Node.js/Express)
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Firebase Admin
- **Payments**: Razorpay + PhonePe integration
- **File Upload**: Multer
- **Email**: Nodemailer
- **Security**: Rate limiting, CORS, input validation

### Admin Panel (React/Vite)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **UI**: Custom components + Radix UI
- **State**: React Context + Hooks
- **Drag & Drop**: @hello-pangea/dnd

## 📁 Detailed Structure

### Frontend (`/frontend/`)

#### Core Application (`/app/`)
```
app/
├── layout.tsx                    # Root layout with metadata
├── page.tsx                      # Homepage
├── globals.css                   # Global styles
├── providers.tsx                 # Context providers
├── sitemap.ts                    # Dynamic sitemap generation
├── robots.ts                     # SEO robots configuration
├── not-found.tsx                 # 404 error page
├── about/                        # About page
├── account/                      # User account management
├── checkout/                     # Shopping cart & checkout
├── collections/                  # Product category pages
├── confirmation/                 # Order confirmation
├── contact/                      # Contact page
├── order-success/                # Order success page
├── payment/                      # Payment processing
├── product/                      # Individual product pages
├── wishlist/                     # User wishlist
└── api/                         # API routes
```

#### Components (`/components/`)
```
components/
├── auth/                         # Authentication components
│   ├── AuthContext.tsx          # Auth state management
│   ├── GoogleLoginButton.tsx    # Google OAuth
│   ├── LoginModal.tsx           # Login modal
│   └── useAuth.ts              # Auth hooks
├── ui/                          # Reusable UI components
│   ├── button.tsx              # Button component
│   ├── dialog.tsx              # Modal dialogs
│   ├── form.tsx                # Form components
│   └── ...                     # 40+ UI components
├── banner-carousel.tsx          # Hero carousel
├── cart-context.tsx             # Shopping cart state
├── cart-sidebar.tsx             # Cart sidebar
├── navbar.tsx                   # Navigation header
├── footer.tsx                   # Site footer
├── product-card.tsx             # Product display
├── product-grid-optimized.tsx   # Product grid
├── wishlist-context.tsx         # Wishlist state
└── ...                         # 50+ components
```

#### Utilities (`/lib/`)
```
lib/
├── api-health.ts                # API health checks
├── firebase.ts                  # Firebase configuration
├── image-utils.ts              # Image optimization
├── server-utils.ts             # Server utilities
└── utils.ts                    # General utilities
```

#### Scripts (`/scripts/`)
```
scripts/
├── build-optimized.js          # Optimized build process
├── generate-webp.js            # Image format conversion
├── optimize-images.js          # Image optimization
├── performance-audit.js        # Performance monitoring
└── test-api.js                # API testing
```

### Backend (`/backend/`)

#### Server Configuration
```
server.js                        # Main Express server
ecosystem.config.js             # PM2 configuration
```

#### Models (`/models/`)
```
models/
├── User.js                      # User authentication model
├── userModel.js                # Extended user model
├── productModel.js             # Product catalog model
├── orderModel.js               # Order management model
├── Category.js                 # Product categories
├── Coupon.js                   # Discount coupons
├── CarouselBanner.js          # Homepage banners
├── Contact.js                  # Contact form submissions
├── Wishlist.js                # User wishlists
└── counterModel.js            # Auto-increment counters
```

#### Controllers (`/controllers/`)
```
controllers/
├── userController.js           # User authentication & management
├── productController.js        # Product CRUD operations
├── orderController.js          # Order processing & management
├── paymentController.js        # Payment processing
├── cartController.js           # Shopping cart operations
├── categoryController.js       # Category management
├── couponController.js         # Discount management
├── carouselController.js       # Banner management
├── contactController.js        # Contact form handling
├── wishlistController.js       # Wishlist operations
├── refundController.js         # Refund processing
└── webhookController.js        # Payment webhooks
```

#### Routes (`/routes/`)
```
routes/
├── userRoute.js                # User authentication routes
├── productRoute.js             # Product API endpoints
├── orderRoute.js               # Order management routes
├── paymentRoute.js             # Payment processing routes
├── cartRoute.js                # Shopping cart routes
├── categoryRoute.js            # Category routes
├── couponRoutes.js             # Coupon routes
├── carouselRoutes.js           # Banner routes
├── contactRoute.js             # Contact form routes
└── wishlistRoutes.js           # Wishlist routes
```

#### Middleware (`/middleware/`)
```
middleware/
├── auth.js                     # JWT authentication
├── adminAuth.js                # Admin authorization
└── multer.js                   # File upload handling
```

#### Configuration (`/config/`)
```
config/
└── mongodb.js                  # Database connection
```

#### Utilities (`/utils/`)
```
utils/
├── invoiceGenerator.js         # PDF invoice generation
└── response.js                 # Standardized API responses
```

#### Scripts (`/scripts/`)
```
scripts/
├── migrate-orders.js           # Order data migration
├── seedCategories.js           # Category seeding
├── seed-carousel.js            # Banner seeding
├── addSleeveTypes.js          # Product attribute migration
├── migrateOrderUserIds.js      # User ID migration
├── normalizeCategorySlugs.js   # URL slug normalization
├── printOrdersByEmail.js       # Order reporting
├── reconcilePhonePeOrders.js   # Payment reconciliation
└── runCategorySeeding.js       # Category setup
```

### Admin Panel (`/admin/`)

#### Core Structure
```
admin/
├── src/
│   ├── App.jsx                 # Main application
│   ├── main.jsx                # Entry point
│   ├── components/             # Admin components
│   │   ├── Login.jsx          # Admin login
│   │   ├── Navbar.jsx         # Admin navigation
│   │   ├── Sidebar.jsx        # Admin sidebar
│   │   ├── ProtectedRoute.jsx # Route protection
│   │   └── ...                # 10+ components
│   ├── pages/                 # Admin pages
│   │   ├── List.jsx           # Product listing
│   │   ├── Add.jsx            # Add products
│   │   ├── EditProduct.jsx    # Edit products
│   │   ├── Orders.jsx         # Order management
│   │   ├── CarouselManagement.jsx # Banner management
│   │   └── CouponManagement.jsx   # Coupon management
│   └── assets/                # Static assets
├── public/                     # Public assets
├── index.html                  # Entry HTML
└── vite.config.js             # Vite configuration
```

## 🔧 Key Features

### E-commerce Functionality
- **Product Catalog**: Categories, filtering, search
- **Shopping Cart**: Add/remove items, quantity management
- **Wishlist**: Save favorite products
- **Checkout**: Multi-step checkout process
- **Payment Processing**: Razorpay + PhonePe integration
- **Order Management**: Order tracking, history
- **User Accounts**: Registration, login, profile management

### Admin Features
- **Product Management**: CRUD operations for products
- **Order Management**: View, update, process orders
- **Category Management**: Organize products
- **Banner Management**: Homepage carousel
- **Coupon Management**: Discount codes
- **User Management**: Customer accounts
- **Analytics**: Sales reports, order tracking

### Technical Features
- **SEO Optimization**: Meta tags, sitemap, structured data
- **Performance**: Image optimization, code splitting
- **Mobile Responsive**: Touch-friendly interface
- **Security**: JWT auth, rate limiting, input validation
- **File Upload**: Product images, banners
- **Email Notifications**: Order confirmations
- **PDF Generation**: Invoices, receipts

## 🚀 Deployment

### Production Configuration
- **Frontend**: Vercel/Netlify deployment
- **Backend**: Railway/Render deployment
- **Database**: MongoDB Atlas
- **CDN**: Cloudinary for images
- **Monitoring**: PM2 process management

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=https://shithaa.in
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
```

#### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/shitha
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

## 📊 Performance & SEO

### Web Vitals Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### SEO Features
- Dynamic meta tags
- Open Graph & Twitter Cards
- Structured data (Organization schema)
- Dynamic sitemap generation
- Robots.txt configuration
- Canonical URLs
- Mobile-first responsive design

## 🔒 Security Features

- JWT-based authentication
- Firebase Auth integration
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Secure payment processing
- HTTPS enforcement (production)

## 📈 Monitoring & Analytics

### Performance Monitoring
- Lighthouse audits
- Core Web Vitals tracking
- Image optimization monitoring
- Bundle size analysis

### Business Analytics
- Order tracking
- Sales reports
- User behavior analysis
- Payment reconciliation

## 🛠️ Development Workflow

### Local Development
1. Clone repository
2. Install dependencies for all three apps
3. Set up environment variables
4. Start MongoDB
5. Run backend server
6. Run frontend development server
7. Run admin panel (if needed)

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Git hooks for pre-commit checks

## 📝 Recent Updates

### ✅ Completed Features
- Order visibility system fixed
- Comprehensive SEO implementation
- Performance optimizations
- Mobile responsiveness
- Payment integration
- Admin panel functionality
- Image optimization
- Error handling improvements

### 🔄 Ongoing Improvements
- Performance monitoring
- SEO optimization
- User experience enhancements
- Security hardening
- Analytics integration

## 📞 Support & Contact

- **Email**: info.shitha@gmail.com
- **Phone**: 8148480720
- **Address**: 118/1 Mahalingapuram, Vellalore, Coimbatore 641111

---

**Built with ❤️ for expecting mothers everywhere**

*Last updated: [Current Date]* 