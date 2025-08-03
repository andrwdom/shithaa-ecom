import WishlistPageClient from "./WishlistPageClient"

export default function WishlistPage() {
  console.log('WishlistPage - Server component rendering')
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Wishlist Test Page</h1>
        <p className="text-gray-600">This is a test to see if the routing works.</p>
      </div>
    </div>
  )
} 