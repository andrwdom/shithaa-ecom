import ContactSection from "@/components/contact-section"
import PageLoading from "@/components/page-loading"
import { Metadata } from "next"
import ContactPageClient from "./ContactPageClient"

// SEO Metadata
export const metadata: Metadata = {
  title: "Contact Shithaa - Get in Touch | Maternity Wear Support",
  description: "Contact Shithaa for any questions about our maternity wear, mom wear, and feeding essentials. We're here to help you find the perfect pieces for your pregnancy journey.",
  keywords: [
    "contact Shithaa",
    "maternity wear contact",
    "feeding wear support",
    "Shithaa customer service",
    "pregnancy clothing help",
    "Shithaa contact information",
    "mom wear support",
    "feeding dresses help",
    "maternity fashion contact",
    "pregnancy clothing customer service",
    "nursing wear support",
    "maternity wear India contact"
  ],
  openGraph: {
    title: "Contact Shithaa - Get in Touch | Maternity Wear Support",
    description: "Contact Shithaa for any questions about our maternity wear, mom wear, and feeding essentials. We're here to help you find the perfect pieces for your pregnancy journey.",
    images: ['/shithaa-logo.jpg'],
    type: 'website',
    url: 'https://shithaa.in/contact',
    siteName: 'Shithaa',
  },
  twitter: {
    title: "Contact Shithaa - Get in Touch | Maternity Wear Support",
    description: "Contact Shithaa for any questions about our maternity wear, mom wear, and feeding essentials. We're here to help you find the perfect pieces for your pregnancy journey.",
    card: 'summary_large_image',
    images: ['/shithaa-logo.jpg'],
  },
}

export default function ContactPage() {
  return <ContactPageClient />
}
