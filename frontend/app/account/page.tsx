import { Metadata } from "next"
import AccountPageClient from "./AccountPageClient"

// SEO Metadata for account page
export const metadata: Metadata = {
  title: "My Account - Shithaa | Maternity Wear Customer Portal",
  description: "Manage your Shithaa account, view order history, and update your profile information for your maternity wear purchases.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AccountPage() {
  return <AccountPageClient />
}