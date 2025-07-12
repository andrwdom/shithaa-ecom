import { Metadata } from "next"
import AccountPageClient from "./AccountPageClient"

// SEO Metadata for account page
export const metadata: Metadata = {
  title: "My Account - Shinthaa",
  description: "Manage your Shinthaa account, view order history, and update your profile information.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AccountPage() {
  return <AccountPageClient />
} 