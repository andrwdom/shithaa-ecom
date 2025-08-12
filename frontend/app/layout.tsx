import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import CartSidebar from "@/components/cart-sidebar"
import LayoutClient from "@/components/layout-client"
import ErrorBoundary from "@/components/error-boundary"
import ServerErrorBoundary from "@/components/server-error-boundary"
import Script from "next/script";
import PerformanceMonitor from "@/components/performance-monitor"

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Shithaa - Elegant Maternity & Feeding Wear | Premium Mother & Baby Clothing",
    template: "%s | Shithaa"
  },
  description: "Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers. Shop the latest collection of maternity feeding wear, zipless lounge wear, and more.",
  keywords: [
    "maternity wear",
    "feeding wear",
    "maternity clothing",
    "pregnancy clothes",
    "nursing wear",
    "zipless feeding wear",
    "maternity lounge wear",
    "mother and baby clothing",
    "pregnancy fashion",
    "nursing clothes",
    "maternity dresses",
    "feeding essentials",
    "Shithaa",
    "Shithaa clothing",
    "best maternity wear",
    "premium maternity clothing",
    "comfortable maternity dresses",
    "stylish maternity fashion",
    "maternity wear online"
  ],
  authors: [{ name: "Shithaa" }],
  creator: "Shithaa",
  publisher: "Shithaa",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://shithaa.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Shithaa',
    title: 'Shithaa - Elegant Maternity & Feeding Wear | Premium Maternity Clothing',
    description: 'Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers. Best maternity clothing online.',
    images: [
      {
        url: '/shithaa-logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Shithaa - Elegant Maternity & Feeding Wear',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shithaa - Elegant Maternity & Feeding Wear | Premium Maternity Clothing',
    description: 'Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers. Best maternity clothing online.',
    images: ['/shitha-logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'fashion',
  classification: 'Maternity & Baby Clothing Store',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Add development mode error logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Layout rendering with API URL:', process.env.NEXT_PUBLIC_API_URL);
  }

  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/shithaa-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/shithaa-logo.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#473C66" />
        <meta name="msapplication-TileColor" content="#473C66" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preload critical images */}
        <link rel="preload" as="image" href="/blue-dress.JPG" type="image/jpeg" />
        <link rel="preload" as="image" href="/prink-dress.JPG" type="image/jpeg" />
        <link rel="preload" as="image" href="/leopard-dress.jpg" type="image/jpeg" />
        <link rel="preload" as="image" href="/shithaa-logo.jpg" type="image/jpeg" />
        
        {/* WebP preloads will be added after running the optimization script */}
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Shithaa",
              "url": "https://shithaa.in",
              "logo": "https://shithaa.in/shithaa-logo.jpg",
              "description": "Elegant Maternity & Feeding Wear - Premium Maternity Clothing",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "IN"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "email": "info.shitha@gmail.com"
              },
              "sameAs": [
                "https://instagram.com/shithaa.in"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Shithaa - Elegant Maternity & Feeding Wear",
              "url": "https://shithaa.in",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://shithaa.in/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "description": "Premium maternity wear and feeding essentials designed for comfort and style. Shop our collection of maternity dresses, feeding wear, and zipless lounge wear."
            })
          }}
        />
      </head>
      <body className="font-body min-h-screen flex flex-col">
        <PerformanceMonitor />
        <ServerErrorBoundary>
          <ErrorBoundary>
            <Providers>
              <LayoutClient>{children}</LayoutClient>
              <CartSidebar />
            </Providers>
          </ErrorBoundary>
        </ServerErrorBoundary>
      </body>
    </html>
  )
}
