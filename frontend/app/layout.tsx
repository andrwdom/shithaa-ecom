import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import CartSidebar from "@/components/cart-sidebar"
import LayoutClient from "@/components/layout-client"
import Script from "next/script";

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
    default: "Shinthaa - Elegant Maternity & Feeding Wear | Premium Mother & Baby Clothing",
    template: "%s | Shinthaa"
  },
  description: "Discover elegant maternity wear and feeding essentials at Shinthaa. Premium quality, comfortable designs for expecting mothers. Shop the latest collection of maternity feeding wear, zipless lounge wear, and more. Free shipping on orders above ₹999.",
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
    "Shinthaa",
    "Shitha clothing"
  ],
  authors: [{ name: "Shinthaa" }],
  creator: "Shinthaa",
  publisher: "Shinthaa",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://shithaa.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Shinthaa',
    title: 'Shinthaa - Elegant Maternity & Feeding Wear',
    description: 'Discover elegant maternity wear and feeding essentials at Shinthaa. Premium quality, comfortable designs for expecting mothers.',
    images: [
      {
        url: '/shitha-logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Shinthaa - Elegant Maternity & Feeding Wear',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shinthaa - Elegant Maternity & Feeding Wear',
    description: 'Discover elegant maternity wear and feeding essentials at Shinthaa. Premium quality, comfortable designs for expecting mothers.',
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
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/shitha-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/shitha-logo.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#473C66" />
        <meta name="msapplication-TileColor" content="#473C66" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Shinthaa",
              "url": "https://shithaa.in",
              "logo": "https://shithaa.in/shitha-logo.jpg",
              "description": "Elegant maternity wear and feeding essentials for expecting mothers",
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
      </head>
      <body className="font-body min-h-screen flex flex-col">
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
        <Providers>
          <LayoutClient>{children}</LayoutClient>
          <CartSidebar />
        </Providers>
      </body>
    </html>
  )
}
