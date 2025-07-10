import React from "react";

export default function ShippingInfoPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Shipping Info</h1>
        <div className="text-gray-700 text-lg space-y-4 text-center">
          <p>Products will be delivered within 3-4 working days</p>
        </div>
      </div>
    </main>
  );
} 