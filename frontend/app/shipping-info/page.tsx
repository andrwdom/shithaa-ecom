import React from "react";
import { Metadata } from "next";

// SEO Metadata for shipping info page
export const metadata: Metadata = {
  title: "Shipping Information - Shithaa",
  description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
  keywords: [
    "shipping information",
    "delivery times",
    "shipping policy",
    "maternity wear shipping",
    "Shithaa delivery",
    "shipping costs",
    "Tamil Nadu shipping",
    "India shipping"
  ],
  openGraph: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">📍 Tamil Nadu Shipping</h3>
              <p className="text-green-700">
                <strong>Free shipping</strong> for most categories within Tamil Nadu. 
                Maternity Feeding Wear has tiered shipping costs based on quantity.
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">🌍 Other States Shipping</h3>
              <p className="text-purple-700">
                Shipping costs apply for all states outside Tamil Nadu. 
                Costs vary by product category and quantity.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">📦 Shipping Cost Structure</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Regular Categories (Lounge Wear, Dupatta, etc.)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-yellow-700">Tamil Nadu:</p>
                    <p className="text-yellow-600">Free shipping for all quantities</p>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-700">Other States:</p>
                    <ul className="text-yellow-600 space-y-1">
                      <li>• 1 item: ₹39</li>
                      <li>• 2 items: ₹59</li>
                      <li>• 3 items: ₹89</li>
                      <li>• 4+ items: ₹105</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Maternity Feeding Wear (Special Category)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-yellow-700">Tamil Nadu:</p>
                    <ul className="text-yellow-600 space-y-1">
                      <li>• 1 item: ₹39</li>
                      <li>• 2 items: ₹49</li>
                      <li>• 3 items: ₹59</li>
                      <li>• 4 items: ₹69</li>
                      <li>• 5 items: ₹79</li>
                      <li>• 6 items: ₹89</li>
                      <li>• 7+ items: ₹99</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-700">Other States:</p>
                    <ul className="text-yellow-600 space-y-1">
                      <li>• 1 item: ₹49</li>
                      <li>• 2 items: ₹69</li>
                      <li>• 3 items: ₹89</li>
                      <li>• 4+ items: ₹109</li>
                    </ul>
                  </div>
                </div>
              </div>
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

          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-indigo-800 mb-2">💡 How Shipping is Calculated</h3>
            <p className="text-indigo-700">
              Shipping costs are automatically calculated during checkout based on:
            </p>
            <ul className="text-indigo-700 space-y-1 mt-2 ml-4">
              <li>• Your delivery location (state)</li>
              <li>• Product categories in your cart</li>
              <li>• Total quantity of items</li>
              <li>• Our backend shipping rules</li>
            </ul>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              For any shipping-related questions, contact us at{" "}
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