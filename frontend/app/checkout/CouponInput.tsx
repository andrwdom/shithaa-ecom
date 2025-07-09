import React, { useState } from 'react'

export default function CouponInput({ value, onApply }: any) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleApply() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/coupons/validate';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input })
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        onApply({ code: input.toUpperCase(), discountPercentage: data.discountPercentage })
        setSuccess('Coupon applied successfully')
        setError('')
      } else {
        setError(data.message || 'Invalid or expired coupon')
        setSuccess('')
        onApply(null)
      }
    } catch {
      setError('Network error. Please try again.')
      setSuccess('')
      onApply(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
      <label className="font-medium mb-1">Coupon Code</label>
      <div className="flex gap-2">
        <input type="text" className="input input-bordered w-full" placeholder="Enter coupon code" value={input} onChange={e => setInput(e.target.value.toUpperCase())} disabled={!!value || loading} />
        {!value ? (
          <button type="button" className="btn btn-primary" onClick={handleApply} disabled={loading || !input}>
            {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Apply'}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => { setInput(''); onApply(null); setError(''); setSuccess('') }}>Remove</button>
        )}
      </div>
      {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
      {success && <div className="text-green-600 text-sm mt-1">{success}</div>}
      {value && (
        <div className="text-green-700 font-semibold mt-2">Discount: {value.discountPercentage}%</div>
      )}
    </div>
  )
} 