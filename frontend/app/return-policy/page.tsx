import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Metadata } from 'next'

// SEO Metadata for return policy page
export const metadata: Metadata = {
  title: "Refund & Exchange Policy - Shithaa | Damaged Products Only",
  description: "Learn about Shithaa's refund policy. We accept refunds and exchanges only for damaged products within 2 days. Contact via Instagram DM or email.",
  keywords: [
    "refund policy",
    "exchange policy", 
    "damaged products",
    "return policy",
    "Shithaa refunds",
    "maternity wear returns",
    "product damage claims"
  ],
  openGraph: {
    title: "Refund & Exchange Policy - Shithaa | Damaged Products Only",
    description: "Learn about Shithaa's refund policy. We accept refunds and exchanges only for damaged products within 2 days.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Refund & Exchange Policy - Shithaa | Damaged Products Only",
    description: "Learn about Shithaa's refund policy. We accept refunds and exchanges only for damaged products within 2 days.",
  },
}

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Refund & Exchange Policy</h1>
        
        <div className="text-gray-700 space-y-6">
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">🔄 Refund & Exchange — Damaged Products Only</h2>
            <p className="text-red-700">We accept refunds and exchanges only for damaged products.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">⏰ Refund Window</h3>
              <p className="text-green-700">Requests must be submitted within 2 days of receiving your order.</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">📹 Video Requirement</h3>
              <p className="text-blue-700">Must include an uninterrupted open-box video showing the damage.</p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 How to Request</h3>
            <ul className="text-yellow-700 space-y-2">
              <li>• For fastest response, DM us on Instagram (preferred)</li>
              <li>• Alternatively, email: info.shithaa@gmail.com</li>
              <li>• Include uninterrupted open-box video showing damage</li>
              <li>• Submit within 2 days of receiving your order</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">📞 Contact Information</h3>
            <p className="text-purple-700">
              For fastest response, DM us on Instagram{" "}
              <a href="https://www.instagram.com/shithaa.in" className="text-[#473C66] hover:underline" target="_blank" rel="noopener noreferrer">
                @shithaa.in
              </a>{" "}
              (preferred). Alternatively, email:{" "}
              <a href="mailto:info.shithaa@gmail.com" className="text-[#473C66] hover:underline">
                info.shithaa@gmail.com
              </a>
            </p>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              For any questions about our refund and exchange policy, please don't hesitate to contact us.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}