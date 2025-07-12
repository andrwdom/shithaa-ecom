import { Metadata } from 'next'
import CheckoutPageClient from './CheckoutPageClient'

// SEO Metadata for checkout page
export const metadata: Metadata = {
  title: "Checkout - Shithaa",
  description: "Complete your order for elegant maternity wear at Shithaa. Secure checkout with multiple payment options.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CheckoutPage() {
  return <CheckoutPageClient />
} 