import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Metadata } from 'next'

// SEO Metadata for return policy page
export const metadata: Metadata = {
  title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
  description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products. Contact us via Instagram DM or email.",
  keywords: [
    "return policy",
    "refund policy",
    "exchange policy",
    "damaged products",
    "product returns",
    "Shithaa returns",
    "maternity wear returns",
    "maternity clothing returns",
    "premium clothing returns"
  ],
  openGraph: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
    description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
    description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products.",
  },
}

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Return & Exchange Policy</h1>
        
        <p className="text-gray-600 mb-6">
          At Shithaa, we are committed to providing you with the highest quality maternity wear. 
          Our refund and exchange policy is designed to ensure customer satisfaction while maintaining 
          the integrity of our products.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Important Refund Criteria</h3>
          <ul className="text-blue-700 space-y-2">
            <li>• Refunds are <strong>only</strong> available for damaged or defective products</li>
            <li>• Products must be in original, unused condition</li>
            <li>• Refund requests must be made within 2 days of receiving your order</li>
            <li>• All refunds are subject to review and approval</li>
          </ul>
        </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">⏰ Time Limit for Claims</h3>
              <p className="text-green-700">
                All refund and exchange requests must be submitted within <strong>2 days of receiving your order</strong>. 
                Claims made after this period will not be considered.
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">📸 Evidence Requirements</h3>
              <p className="text-blue-700">
                To process your claim, we require <strong>video evidence without pause</strong> clearly showing the damage or defect. 
                Photos may also be requested as additional documentation.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">📋 Eligibility Criteria</h3>
            <ul className="text-yellow-700 space-y-2 text-base">
              <li>• <strong>Product must be damaged or defective</strong> upon delivery</li>
              <li>• <strong>Video evidence without pause</strong> must be provided</li>
              <li>• Product must be in original, unworn condition</li>
              <li>• Original packaging and tags must be intact</li>
              <li>• Claim must be submitted within 2 days of delivery</li>
              <li>• Original invoice or order confirmation must be included</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">🚫 What We Don't Accept</h3>
            <ul className="text-purple-700 space-y-2 text-base">
              <li>• Change of mind or preference</li>
              <li>• Incorrect size selection by customer</li>
              <li>• Products worn or used after delivery</li>
              <li>• Claims submitted after 2 days</li>
              <li>• Products without proper video evidence</li>
              <li>• Items returned without original packaging</li>
            </ul>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">📞 How to Submit a Claim</h3>
            <p className="text-indigo-700 mb-3">
              To request a refund or exchange for a damaged product, please follow these steps:
            </p>
            <ol className="text-indigo-700 space-y-2 ml-4">
              <li>1. <strong>Document the damage immediately</strong> - Take a video without pause showing the defect</li>
              <li>2. <strong>Contact us within 2 days</strong> of receiving your order</li>
              <li>3. <strong>Provide video evidence</strong> and order details</li>
              <li>4. <strong>Wait for our assessment</strong> and response</li>
            </ol>
            <p className="text-indigo-700 mt-3">
              Contact us via Instagram direct message at{" "}
              <a href="https://www.instagram.com/shithaa.in" className="text-[#473C66] hover:underline font-semibold" target="_blank" rel="noopener noreferrer">
                @shithaa.in
              </a>{" "}
              (preferred method) or email us at{" "}
              <a href="mailto:info.shithaa@gmail.com" className="text-[#473C66] hover:underline font-semibold">
                info.shithaa@gmail.com
              </a>
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⚡ Processing Time</h3>
            <p className="text-gray-700">
              Once we receive your claim with proper video evidence, we will review it within <strong>24-48 hours</strong>. 
              If approved, refunds will be processed within <strong>5-7 business days</strong> to your original payment method.
            </p>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              For any questions about our return and exchange policy, please don't hesitate to contact us. 
              We're here to ensure your satisfaction with our products.
            </p>
          </div>
        </div>
    </main>
  )
}