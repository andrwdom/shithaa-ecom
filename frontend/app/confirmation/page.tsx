import { Metadata } from 'next';
import ConfirmationPageClient from './ConfirmationPageClient';

// SEO Metadata for confirmation page
export const metadata: Metadata = {
  title: "Order Confirmation - Shinthaa",
  description: "Your order has been confirmed. Thank you for choosing Shinthaa for your maternity wear needs.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConfirmationPage() {
  return <ConfirmationPageClient />
}