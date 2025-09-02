# Shithaa Responsive Design System

## Overview

This document outlines the comprehensive responsive design system implemented across the Shithaa e-commerce platform. The system ensures consistent, scalable, and maintainable responsive layouts across all devices.

## Breakpoint System

### Standard Breakpoints
```css
xs: 475px   /* Extra small devices */
sm: 640px   /* Small devices (landscape phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (desktops) */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Usage Guidelines
- **Mobile First**: Always start with mobile styles and enhance for larger screens
- **Consistent Breakpoints**: Use the defined breakpoints across all components
- **Progressive Enhancement**: Add features and complexity as screen size increases

## Responsive Components

### 1. ResponsiveContainer
```tsx
import ResponsiveContainer from '@/components/ui/responsive-container'

<ResponsiveContainer size="xl" padding="md">
  {/* Content */}
</ResponsiveContainer>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

### 2. ResponsiveGrid
```tsx
import ResponsiveGrid from '@/components/ui/responsive-grid'

<ResponsiveGrid type="products" gap="md">
  {/* Grid items */}
</ResponsiveGrid>
```

**Props:**
- `type`: 'products' | 'content' | 'features'
- `gap`: 'sm' | 'md' | 'lg' | 'xl'
- `cols`: Custom column configuration

### 3. ResponsiveText
```tsx
import ResponsiveText from '@/components/ui/responsive-text'

<ResponsiveText size="xl" weight="bold" color="brand">
  Your text here
</ResponsiveText>
```

**Props:**
- `size`: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
- `weight`: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
- `color`: 'primary' | 'secondary' | 'muted' | 'accent' | 'brand'

### 4. ResponsiveSection
```tsx
import ResponsiveSection from '@/components/ui/responsive-section'

<ResponsiveSection padding="lg" background="gradient">
  {/* Section content */}
</ResponsiveSection>
```

**Props:**
- `containerSize`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
- `padding`: 'none' | 'sm' | 'md' | 'lg' | 'xl'
- `background`: 'white' | 'gray' | 'brand' | 'gradient'

## CSS Classes

### Container Classes
```css
.container-responsive     /* Main responsive container */
```

### Grid Classes
```css
.grid-responsive         /* General responsive grid */
.grid-products          /* Product-specific grid */
```

### Typography Classes
```css
.text-responsive-xs     /* Extra small responsive text */
.text-responsive-sm     /* Small responsive text */
.text-responsive-base   /* Base responsive text */
.text-responsive-lg     /* Large responsive text */
.text-responsive-xl     /* Extra large responsive text */
.text-responsive-2xl    /* 2X large responsive text */
.text-responsive-3xl    /* 3X large responsive text */
```

### Spacing Classes
```css
.spacing-section        /* Section-level spacing */
.spacing-component      /* Component-level spacing */
```

### Layout Classes
```css
.flex-responsive        /* Responsive flex layout */
.flex-responsive-reverse /* Responsive flex reverse */
.aspect-responsive      /* Responsive aspect ratio */
```

### Navigation Classes
```css
.navbar-responsive      /* Responsive navbar height */
.navbar-logo-responsive /* Responsive logo sizing */
```

### Utility Classes
```css
.hide-mobile           /* Hide on mobile */
.hide-tablet           /* Hide on tablet */
.hide-desktop          /* Hide on desktop */
```

## Responsive Hooks

### useResponsive
```tsx
import { useResponsive } from '@/hooks/use-responsive'

const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive()
```

### useResponsiveUtils
```tsx
import { useResponsiveUtils } from '@/hooks/use-responsive'

const { getResponsiveValue, getBreakpointValue } = useResponsiveUtils()

const fontSize = getResponsiveValue({
  mobile: 'text-sm',
  tablet: 'text-base',
  desktop: 'text-lg',
  default: 'text-base'
})
```

## Implementation Guidelines

### 1. Mobile-First Approach
Always start with mobile styles and enhance for larger screens:

```css
/* Mobile first */
.component {
  padding: 1rem;
  font-size: 0.875rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
    font-size: 1rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
    font-size: 1.125rem;
  }
}
```

### 2. Consistent Spacing
Use the defined spacing scale:

```css
/* Use CSS custom properties */
padding: var(--space-md);
margin: var(--space-lg);

/* Or Tailwind classes */
p-4 sm:p-6 lg:p-8
```

### 3. Responsive Images
Use the responsive aspect ratio class:

```tsx
<div className="aspect-responsive">
  <Image src="/image.jpg" alt="Description" fill />
</div>
```

### 4. Grid Layouts
Use the appropriate grid class for your content:

```tsx
{/* For products */}
<div className="grid-products">
  {products.map(product => <ProductCard key={product.id} product={product} />)}
</div>

{/* For general content */}
<div className="grid-responsive">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>
```

## Component Migration Guide

### Before (Inconsistent)
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl">
    Title
  </h1>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
    {/* Items */}
  </div>
</div>
```

### After (Consistent)
```tsx
<ResponsiveContainer size="xl">
  <ResponsiveText size="3xl" weight="bold">
    Title
  </ResponsiveText>
  <ResponsiveGrid type="products" gap="md">
    {/* Items */}
  </ResponsiveGrid>
</ResponsiveContainer>
```

## Performance Considerations

### 1. CSS Custom Properties
Use CSS custom properties for consistent values:

```css
:root {
  --space-md: 1rem;
  --text-lg: 1.125rem;
}
```

### 2. Reduced Motion
Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-responsive {
    animation: none !important;
    transition: none !important;
  }
}
```

### 3. Container Queries
Use container queries for component-level responsiveness:

```css
@container (min-width: 300px) {
  .card {
    padding: 1.5rem;
  }
}
```

## Testing Guidelines

### 1. Device Testing
Test on actual devices:
- Mobile: iPhone SE (375px), iPhone 12 (390px)
- Tablet: iPad (768px), iPad Pro (1024px)
- Desktop: 1280px, 1440px, 1920px

### 2. Browser Testing
Test across browsers:
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

### 3. Accessibility Testing
- Test with screen readers
- Verify keyboard navigation
- Check color contrast ratios

## Maintenance

### 1. Regular Audits
- Monthly responsive design audits
- Performance testing on different devices
- User feedback analysis

### 2. Updates
- Keep breakpoints consistent
- Update components when design system changes
- Document any new patterns

### 3. Team Guidelines
- All developers must use the responsive system
- Code reviews should check for responsive consistency
- New components must follow the established patterns

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mobile-First Design Principles](https://bradfrost.com/blog/web/mobile-first-responsive-web-design/)
