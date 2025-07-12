import { Metadata } from 'next'
import PrivacyPolicyPageClient from './PrivacyPolicyPageClient'

// SEO Metadata for privacy policy page
export const metadata: Metadata = {
  title: "Privacy Policy - Shinthaa",
  description: "Read the Privacy Policy for Shinthaa. Learn how we collect, use, and protect your personal information when you visit or make a purchase from our website.",
  keywords: [
    "privacy policy",
    "data protection",
    "personal information",
    "Shinthaa privacy",
    "maternity wear privacy",
    "customer data"
  ],
  openGraph: {
    title: "Privacy Policy - Shinthaa",
    description: "Read the Privacy Policy for Shinthaa. Learn how we collect, use, and protect your personal information.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Privacy Policy - Shinthaa",
    description: "Read the Privacy Policy for Shinthaa. Learn how we collect, use, and protect your personal information.",
  },
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyPageClient />
} 