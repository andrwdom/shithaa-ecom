import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-pink-50 to-green-50">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Return Policy</h1>
        <div className="text-gray-700 text-lg space-y-4">
          <p>We offer return and refund only if the delivered product is damaged or defective.</p>
          <p>So you can return the item in 7 days from date of delivery.</p>
          <p>If approved for refund, the amount will be processed and credited within 7-10 business days.</p>
        </div>
      </div>
    </main>
  )
} 