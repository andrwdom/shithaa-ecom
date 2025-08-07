'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PhonePeDebugPage() {
  const [transactionId, setTransactionId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const testVerification = async () => {
    if (!transactionId) return
    
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/verify/${transactionId}`)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testDebug = async () => {
    if (!transactionId) return
    
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/debug/${transactionId}`)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const testOrderCheck = async () => {
    if (!transactionId) return
    
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders/phonepe/${transactionId}`)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const quickFix = async () => {
    if (!transactionId) return
    
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/quick-fix/${transactionId}`, {
        method: 'POST'
      })
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  const markAsPaid = async () => {
    if (!transactionId) return
    
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/test-success/${transactionId}`, {
        method: 'POST'
      })
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PhonePe Payment Debug</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Transaction ID:</label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter merchantTransactionId"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={testVerification}
              disabled={loading || !transactionId}
              className="bg-blue-500 text-white p-2 rounded disabled:opacity-50"
            >
              Test Verification
            </button>
            
            <button
              onClick={testDebug}
              disabled={loading || !transactionId}
              className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
            >
              Test Debug
            </button>
            
            <button
              onClick={testOrderCheck}
              disabled={loading || !transactionId}
              className="bg-purple-500 text-white p-2 rounded disabled:opacity-50"
            >
              Test Order Check
            </button>
            
            <button
              onClick={quickFix}
              disabled={loading || !transactionId}
              className="bg-orange-500 text-white p-2 rounded disabled:opacity-50"
            >
              Quick Fix
            </button>
            
            <button
              onClick={markAsPaid}
              disabled={loading || !transactionId}
              className="bg-red-500 text-white p-2 rounded disabled:opacity-50"
            >
              Mark as Paid
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 p-4 rounded mb-4">
            <div className="loading loading-spinner loading-sm text-blue-600"></div>
            <span className="ml-2">Loading...</span>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
} 