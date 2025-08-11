"use client"

export default function TermsPageClient() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 text-gray-900 bg-white rounded-xl shadow-md mt-8 mb-8">
        <button
          onClick={() => window.history.back()}
          className="mb-6 text-sm text-[rgb(71,60,102)] hover:underline font-medium px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-6 font-serif">Terms and Conditions</h1>
        <div className="space-y-6 text-base leading-relaxed">
          <p>
            Welcome to Shithaa.in. These Terms and Conditions ("Terms") govern your use of our website located at www.shithaa.in and the services we offer. By accessing or using the Site, you agree to be bound by these Terms.
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <b>General Information</b><br />
              This website is operated by S KARTHIKA. Throughout the site, the terms "we", "us" and "our" refer to Shithaa.
            </li>
            <li>
              <b>Use of Our Website</b><br />
              By using this website, you represent that you are at least the age of majority in your state or province of residence. You agree not to use our products for any illegal or unauthorized purpose.
            </li>
            <li>
              <b>Products & Pricing</b><br />
              All dresses and related products are subject to availability.<br />
              We reserve the right to change prices and product descriptions at any time without notice.<br />
              We try to display product colors accurately, but cannot guarantee your device's display will reflect colors exactly.
            </li>
            <li>
              <b>Orders</b><br />
              Once you place an order, you will receive an order confirmation via email or SMS.<br />
              We reserve the right to refuse or cancel any order at our discretion.<br />
              If your order is canceled after payment, we will initiate a full refund.
            </li>
            <li>
              <b>Shipping & Delivery</b><br />
              Products will be delivered within 3-4 working days.<br />
              Delivery times vary depending on your location.
            </li>
            <li>
              <b>Refund & Exchange — Damaged Products Only</b><br />
              We accept refunds and exchanges only for damaged products.<br />
              Requests must be submitted within 2 days of receiving your order and must include an uninterrupted open-box video showing the damage.<br />
              For fastest response, DM us on Instagram (preferred). Alternatively, email: <a href="mailto:info.shithaa@gmail.com" className="underline">info.shithaa@gmail.com</a>.
            </li>
            <li>
              <b>Intellectual Property</b><br />
              All content on this website (images, text, design, logo, etc.) is the property of Shithaa and may not be copied or used without written permission.
            </li>
            <li>
              <b>Limitation of Liability</b><br />
              We are not liable for any direct, indirect, incidental, or consequential damages resulting from your use of our website or products.
            </li>
            <li>
              <b>Changes to Terms</b><br />
              We reserve the right to update or change these Terms at any time. Continued use of the site following changes means you accept the new terms.
            </li>
            <li>
              <b>Contact Information</b><br />
              For any questions or concerns, please contact us:<br />
              Email: <a href="mailto:info.shithaa@gmail.com" className="underline">info.shithaa@gmail.com</a><br />
              Instagram: <a href="https://www.instagram.com/shithaa.in" className="underline" target="_blank" rel="noopener noreferrer">@shithaa.in</a>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}