import ContactSection from "@/components/contact-section"
import PageLoading from "@/components/page-loading"
import { Metadata } from "next"
import ContactPageClient from "./ContactPageClient"

// SEO Metadata
export const metadata: Metadata = {
  title: "Contact Shithaa - Get in Touch",
  description: "Contact Shithaa for any questions about our maternity wear and feeding essentials. We're here to help you find the perfect pieces for your journey.",
  keywords: [
    "contact Shithaa",
    "maternity wear contact",
    "feeding wear support",
    "Shithaa customer service",
    "pregnancy clothing help",
    "Shithaa contact information"
  ],
  openGraph: {
    title: "Contact Shithaa - Get in Touch",
    description: "Contact Shithaa for any questions about our maternity wear and feeding essentials.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Contact Shithaa - Get in Touch",
    description: "Contact Shithaa for any questions about our maternity wear and feeding essentials.",
  },
}

export default function ContactPage() {
  return <ContactPageClient />
}
