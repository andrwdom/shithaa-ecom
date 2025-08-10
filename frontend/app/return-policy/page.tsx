import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Metadata } from 'next'

// SEO Metadata for return policy page
export const metadata: Metadata = {
  title: "Return Policy - Shithaa | Premium Maternity Wear Returns",
  description: "Learn about Shithaa's refund policy. Refund requests are accepted within 2 days of receiving your order. Contact via Instagram DM or email.",
  keywords: [
    "return policy",
    "refund policy",
    "product returns",
    "Shithaa returns",
    "maternity wear returns",
    "maternity clothing returns",
    "premium clothing returns"
  ],
  openGraph: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns",
    description: "Learn about Shithaa's refund policy. Refund requests accepted within 2 days of receiving your order.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns",
    description: "Learn about Shithaa's refund policy. Refund requests accepted within 2 days of receiving your order.",
  },
}

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Return Policy</h1>
        
        <div className="text-gray-700 space-y-6">
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">🔄 Refund Policy</h2>
            <p className="text-red-700">We offer refunds only if the delivered product is damaged or defective.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">⏰ Refund Window</h3>
              <p className="text-green-700">We only accept refund requests within 2 days of receiving your order.</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">💰 How to Request</h3>
              <p className="text-blue-700">To request a refund, please contact us via Instagram direct message (preferred) or email us at info.shitha@gmail.com.</p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 Return Conditions</h3>
            <ul className="text-yellow-700 space-y-2">
              <li>• Product must be unused and in original packaging</li>
              <li>• Only damaged or defective products are eligible for refund</li>
              <li>• Refund requests must be made within 2 days of receiving your order</li>
              <li>• Original invoice must be included if a return is requested</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">📞 How to Request a Refund</h3>
            <p className="text-purple-700">
              We only accept refund requests within 2 days of receiving your order. To request a refund, contact us at{" "}
              <a href="mailto:info.shitha@gmail.com" className="text-[#473C66] hover:underline">
                info.shitha@gmail.com
              </a>{" "}
              or DM us on Instagram{" "}
                              <a href="https://www.instagram.com/shitha_clothing" className="text-[#473C66] hover:underline" target="_blank" rel="noopener noreferrer">
                @shitha_clothing
                </a>{" "}
              Refund requests made after 2 days from the date you receive your order will not be eligible.
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