import { Metadata } from "next"
import WishlistPageClient from "./WishlistPageClient"

export const metadata: Metadata = {
  title: "Wishlist - Shithaa Maternity Wear | Save Your Favorites",
  description: "Save your favorite maternity wear, mom wear, and feeding dresses to your wishlist. Create your dream collection of elegant pregnancy clothing at Shithaa.",
  keywords: [
    "maternity wear wishlist",
    "mom wear favorites",
    "feeding dresses wishlist",
    "pregnancy clothing favorites",
    "maternity fashion wishlist",
    "nursing wear wishlist",
    "maternity maxi wishlist",
    "feeding wear favorites",
    "maternity gown wishlist",
    "pregnancy clothing collection"
  ],
  openGraph: {
    title: "Wishlist - Shithaa Maternity Wear | Save Your Favorites",
    description: "Save your favorite maternity wear, mom wear, and feeding dresses to your wishlist. Create your dream collection of elegant pregnancy clothing.",
    images: ['/shithaa-logo.jpg'],
    type: 'website',
    url: 'https://shithaa.in/wishlist',
    siteName: 'Shithaa',
  },
  twitter: {
    title: "Wishlist - Shithaa Maternity Wear | Save Your Favorites",
    description: "Save your favorite maternity wear, mom wear, and feeding dresses to your wishlist. Create your dream collection of elegant pregnancy clothing.",
    card: 'summary_large_image',
    images: ['/shithaa-logo.jpg'],
  },
}

export default function WishlistPage() {
  return <WishlistPageClient />
} 