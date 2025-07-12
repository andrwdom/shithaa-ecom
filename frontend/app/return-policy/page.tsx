import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Metadata } from 'next'

// SEO Metadata for return policy page
export const metadata: Metadata = {
  title: "Return Policy - Shinthaa",
  description: "Learn about Shinthaa's return and refund policy. Easy returns for damaged or defective products within 7 days of delivery.",
  keywords: [
    "return policy",
    "refund policy",
    "maternity wear returns",
    "Shinthaa returns",
    "damaged products",
    "defective products"
  ],
  openGraph: {
    title: "Return Policy - Shinthaa",
    description: "Learn about Shinthaa's return and refund policy. Easy returns for damaged or defective products.",
    images: ['/shitha-logo.jpg'],
  },
  twitter: {
    title: "Return Policy - Shinthaa",
    description: "Learn about Shinthaa's return and refund policy. Easy returns for damaged or defective products.",
  },
}

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Return Policy</h1>
        
        <div className="text-gray-700 space-y-6">
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">🔄 Easy Returns</h2>
            <p className="text-red-700">We offer return and refund only if the delivered product is damaged or defective.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">⏰ Return Window</h3>
              <p className="text-green-700">You can return the item within 7 days from the date of delivery</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">💰 Refund Timeline</h3>
              <p className="text-blue-700">If approved for refund, the amount will be processed and credited within 7-10 business days</p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 Return Conditions</h3>
            <ul className="text-yellow-700 space-y-2">
              <li>• Product must be unused and in original packaging</li>
              <li>• Only damaged or defective products are eligible for return</li>
              <li>• Return request must be made within 7 days of delivery</li>
              <li>• Original invoice must be included with the return</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">📞 How to Return</h3>
            <p className="text-purple-700">
              Contact us at{" "}
              <a href="mailto:info.shitha@gmail.com" className="text-[#473C66] hover:underline">
                info.shitha@gmail.com
              </a>{" "}
              or call{" "}
              <a href="tel:8148480720" className="text-[#473C66] hover:underline">
                8148480720
              </a>{" "}
              to initiate your return.
            </p>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              For any questions about our return policy, please don't hesitate to contact us.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
} 