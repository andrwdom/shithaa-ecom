import { Metadata } from 'next'
import PrivacyPolicyPageClient from './PrivacyPolicyPageClient'

// SEO Metadata for privacy policy page
export const metadata: Metadata = {
  title: "Privacy Policy - Shithaa | Maternity Wear Privacy",
  description: "Read the Privacy Policy for Shithaa. Learn how we collect, use, and protect your personal information when you visit or make a purchase from our premium maternity wear website.",
  keywords: [
    "privacy policy",
    "data protection",
    "customer privacy",
    "Shithaa privacy",
    "personal information",
    "maternity wear privacy",
    "online shopping privacy"
  ],
  openGraph: {
    title: "Privacy Policy - Shithaa | Maternity Wear Privacy",
    description: "Read the Privacy Policy for Shithaa. Learn how we collect, use, and protect your personal information when shopping for premium maternity wear.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Privacy Policy - Shithaa | Maternity Wear Privacy",
    description: "Read the Privacy Policy for Shithaa. Learn how we collect, use, and protect your personal information when shopping for premium maternity wear.",
  },
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyPageClient />
}