import { Metadata } from 'next'
import TermsPageClient from './TermsPageClient'

// SEO Metadata for terms page
export const metadata: Metadata = {
  title: "Terms and Conditions - Shinthaa",
  description: "Read the Terms and Conditions for using Shinthaa's website and services. Learn about our policies, shipping, returns, and more.",
  keywords: [
    "terms and conditions",
    "Shinthaa terms",
    "maternity wear terms",
    "website terms",
    "shipping policy",
    "return policy"
  ],
  openGraph: {
    title: "Terms and Conditions - Shinthaa",
    description: "Read the Terms and Conditions for using Shinthaa's website and services.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Terms and Conditions - Shinthaa",
    description: "Read the Terms and Conditions for using Shinthaa's website and services.",
  },
}

export default function TermsPage() {
  return <TermsPageClient />
}
