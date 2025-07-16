import React from 'react'

export default function PlaceOrderButton({ loading, disabled }: any) {
  return (
    <button
      type="submit"
      className="w-full h-14 text-lg font-bold mt-2 mb-2 sticky bottom-0 z-20 rounded-xl shadow bg-brand text-white transition-all duration-200 hover:bg-brand-dark active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={loading || disabled}
      aria-busy={loading}
      aria-disabled={loading || disabled}
    >
      {loading ? <span className="loading loading-spinner loading-md"></span> : 'Place Order'}
    </button>
  )
} 