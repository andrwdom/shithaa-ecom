'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PhonePeRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirectUrl')
  const transactionId = searchParams.get('transactionId')

  useEffect(() => {
    // Add warning when user tries to leave
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = 'Are you sure you want to leave? Your payment will be cancelled.'
      e.preventDefault()
      e.returnValue = message
      return message
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Set a 15-minute timeout to auto-cancel
    const timeout = setTimeout(async () => {
      try {
        // Mark payment as failed due to timeout
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment/phonepe/verify/${transactionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'TIMEOUT',
            message: 'Payment timed out after 15 minutes'
          })
        })

        // Redirect to failure page
        router.push(`/payment-failed?reason=${encodeURIComponent('Payment timed out')}`)
      } catch (error) {
        console.error('Error handling timeout:', error)
        router.push(`/payment-failed?reason=${encodeURIComponent('Payment timed out')}`)
      }
    }, 15 * 60 * 1000) // 15 minutes

    // If we have a redirect URL, go to PhonePe
    if (redirectUrl) {
      window.location.href = redirectUrl
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearTimeout(timeout)
    }
  }, [redirectUrl, router, transactionId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#473C66] mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Redirecting to payment gateway...</p>
        <p className="mt-2 text-sm text-gray-500">Please do not close this window</p>
      </div>
    </div>
  )
}
