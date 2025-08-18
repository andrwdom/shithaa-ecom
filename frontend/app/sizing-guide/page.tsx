import { Metadata } from "next"
import SizingGuideClient from "./SizingGuideClient"

export const metadata: Metadata = {
  title: "Size Guide - Shithaa Maternity Wear | Find Your Perfect Fit",
  description: "Find your perfect fit with our comprehensive size guide for maternity wear, mom wear, and zipless feeding loungewear. Get accurate measurements and sizing charts for pregnancy clothing.",
  keywords: [
    "maternity size guide",
    "pregnancy clothing sizes", 
    "maternity wear sizing",
    "zipless feeding size chart",
    "mom wear size guide",
    "feeding dresses sizing",
    "maternity fashion size chart",
    "pregnancy clothing measurements",
    "nursing wear sizing",
    "maternity maxi size guide",
    "maternity gown sizing",
    "feeding wear measurements"
  ],
  openGraph: {
    title: "Size Guide - Shithaa Maternity Wear | Find Your Perfect Fit",
    description: "Find your perfect fit with our comprehensive size guide for maternity wear, mom wear, and zipless feeding loungewear.",
    images: ['/shithaa-logo.jpg'],
    type: 'website',
    url: 'https://shithaa.in/sizing-guide',
    siteName: 'Shithaa',
  },
  twitter: {
    title: "Size Guide - Shithaa Maternity Wear | Find Your Perfect Fit",
    description: "Find your perfect fit with our comprehensive size guide for maternity wear, mom wear, and zipless feeding loungewear.",
    card: 'summary_large_image',
    images: ['/shithaa-logo.jpg'],
  },
}

export default function SizingGuidePage() {
  return <SizingGuideClient />
} 