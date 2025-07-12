"use client"

export default function PrivacyPolicyPageClient() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 text-gray-900 bg-white rounded-xl shadow-md mt-8 mb-8">
        <button
          onClick={() => window.history.back()}
          className="mb-6 text-sm text-[rgb(71,60,102)] hover:underline font-medium px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-6 font-serif">Privacy Policy</h1>
        <div className="space-y-6 text-base leading-relaxed">
          <ol className="list-decimal pl-6 space-y-2">
            <li><b>Introduction</b><br/>At Shinthaa we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your data when you visit or make a purchase from our website.</li>
            <li><b>Information We Collect</b><br/>
              - Personal Information: Name, email address, shipping address, phone number, and payment details.<br/>
              - Non-Personal Information: IP address, browser type, device information, and browsing behavior.
            </li>
            <li><b>How We Use Your Information</b><br/>
              We use your information to:
              <ul className="list-disc pl-6">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your orders or inquiries</li>
                <li>Improve our website and customer service</li>
                <li>Send promotional emails (if you opt-in)</li>
              </ul>
            </li>
            <li><b>Sharing Your Information</b><br/>
              We do not sell or rent your personal information to third parties. We may share your data with:
              <ul className="list-disc pl-6">
                <li>Service providers (e.g., shipping companies, payment processors)</li>
                <li>Law enforcement, if required by law</li>
              </ul>
            </li>
            <li><b>Data Security</b><br/>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure.</li>
            <li><b>Your Rights</b><br/>
              You have the right to:
              <ul className="list-disc pl-6">
                <li>Access the personal information we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Withdraw consent for data processing (where applicable)</li>
              </ul>
            </li>
            <li><b>Cookies</b><br/>We use cookies to improve your browsing experience and analyze website traffic. You can disable cookies in your browser settings if you prefer not to share this data.</li>
            <li><b>Changes to This Privacy Policy</b><br/>We may update this policy from time to time. Any changes will be posted on this page with the updated date.</li>
            <li><b>Contact Us</b><br/>If you have any questions or concerns about this Privacy Policy, please contact us at:<br/>Email: <a href="mailto:info.shitha@gmail.com" className="underline">info.shitha@gmail.com</a><br/>Phone: <a href="tel:8148480720" className="underline">8148480720</a><br/>Address: 118/1 mahalingapuram, Vellalore, Coimbatore-641111</li>
          </ol>
        </div>
      </main>
    </div>
  )
} 