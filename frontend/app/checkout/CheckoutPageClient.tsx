'use client'

import CheckoutPage from './CheckoutPage'
import { useAuth } from '@/components/auth/useAuth'
import LoginModal from '@/components/auth/LoginModal'
import { useState } from 'react'

export default function CheckoutPageClient() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) return null;
  if (!user) {
    return (
      <>
        <LoginModal open={true} onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Sign in to continue to checkout</h2>
            <p className="text-gray-600 mb-6">You must be logged in to place an order.</p>
            <button className="btn btn-primary" onClick={() => setShowLogin(true)}>Sign In / Sign Up</button>
          </div>
        </div>
      </>
    );
  }
  return <CheckoutPage />
} 