import { Metadata } from 'next';
import ConfirmationPageClient from './ConfirmationPageClient';

// SEO Metadata for confirmation page
export const metadata: Metadata = {
  title: "Order Confirmation - Shithaa | Premium Maternity Wear",
  description: "Your order has been confirmed. Thank you for choosing Shithaa for your premium maternity wear needs.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConfirmationPage() {
  return <ConfirmationPageClient />
}