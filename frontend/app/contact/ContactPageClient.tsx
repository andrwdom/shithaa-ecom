"use client"

import ContactSection from "@/components/contact-section"
import PageLoading from "@/components/page-loading"

export default function ContactPageClient() {
  return (
    <PageLoading loadingMessage="Loading Contact Information..." minLoadingTime={1000}>
      <div className="min-h-screen bg-white">
        <ContactSection />
      </div>
    </PageLoading>
  )
} 