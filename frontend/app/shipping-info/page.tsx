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
    "shipping costs"
  ],
  openGraph: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs.",
  },
}

export default function ShippingInfoPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Shipping Information</h1>
        
        <div className="text-gray-700 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">🚚 Fast & Reliable Delivery</h2>
            <p className="text-blue-700">Products will be delivered within 3-4 working days across India</p>
          </div>

          {/* Maternity Feeding Wear Shipping */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-green-800 mb-4">👗 Maternity Feeding Wear</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Tamil Nadu</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>1 item: ₹39</li>
                  <li>2 items: ₹49</li>
                  <li>3 items: ₹59</li>
                  <li>4 items: ₹69</li>
                  <li>5 items: ₹79</li>
                  <li>6 items: ₹89</li>
                  <li>7+ items: ₹99</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Other States</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>1 item: ₹49</li>
                  <li>2 items: ₹69</li>
                  <li>3 items: ₹89</li>
                  <li>4+ items: ₹109</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Lounge Wear Shipping */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">👘 Lounge Wear (All Categories)</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">Tamil Nadu</h4>
                <p className="text-purple-600 font-medium">🎉 FREE SHIPPING</p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">Other States</h4>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>1 item: ₹39</li>
                  <li>2 items: ₹49</li>
                  <li>3 items: ₹59</li>
                  <li>4 items: ₹69</li>
                  <li>5 items: ₹79</li>
                  <li>6 items: ₹89</li>
                  <li>7+ items: ₹99</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Other Categories Shipping */}
          <div className="bg-orange-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-orange-800 mb-4">🛍️ Other Categories</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-orange-700 mb-2">Tamil Nadu</h4>
                <p className="text-orange-600 font-medium">🎉 FREE SHIPPING</p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-700 mb-2">Other States</h4>
                <ul className="text-sm text-orange-600 space-y-1">
                  <li>1 item: ₹39</li>
                  <li>2 items: ₹59</li>
                  <li>3 items: ₹89</li>
                  <li>4+ items: ₹105</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mixed Cart Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📦 Mixed Cart Orders</h3>
            <p className="text-gray-700">For orders containing items from multiple categories, shipping is calculated separately for each category and then added together.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📍 Delivery Areas</h3>
            <p className="text-gray-700">We deliver to all major cities and towns across India. Remote areas may take 1-2 additional days.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📞 Order Tracking</h3>
            <p className="text-gray-700">You'll receive SMS and email updates with tracking information once your order ships.</p>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 mb-4">
              For any questions about shipping, please contact us at{" "}
              <a href="mailto:info.shithaa@gmail.com" className="text-[#473C66] hover:underline">
                info.shithaa@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}