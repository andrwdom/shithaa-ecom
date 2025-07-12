import React from "react";
import { Metadata } from "next";

// SEO Metadata for shipping info page
export const metadata: Metadata = {
  title: "Shipping Information - Shithaa",
  description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Fast and reliable delivery across India.",
  keywords: [
    "shipping information",
    "delivery times",
    "shipping policy",
    "maternity wear shipping",
    "Shithaa delivery",
    "free shipping"
  ],
  openGraph: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs.",
  },
}

export default function ShippingInfoPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Shipping Information</h1>
        
        <div className="text-gray-700 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">🚚 Fast & Reliable Delivery</h2>
            <p className="text-blue-700">Products will be delivered within 3-4 working days across India</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">📦 Free Shipping</h3>
              <p className="text-green-700">Free shipping on orders above ₹999 to Tamil Nadu</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">💰 Shipping Cost</h3>
              <p className="text-purple-700">₹49 shipping fee for orders below ₹999 or outside Tamil Nadu</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📍 Delivery Areas</h3>
            <p className="text-gray-700">We deliver to all major cities and towns across India. Remote areas may take 1-2 additional days.</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">📞 Order Tracking</h3>
            <p className="text-orange-700">You'll receive SMS and email updates with tracking information once your order ships.</p>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              For any shipping-related questions, contact us at{" "}
              <a href="mailto:info.shitha@gmail.com" className="text-[#473C66] hover:underline">
                info.shitha@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 