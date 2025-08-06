"use client"
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, getIdToken } from "firebase/auth";
import { toast } from "sonner";
import GoogleLoginButton from "./GoogleLoginButton";

export default function LoginModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields on modal close
  function handleClose() {
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <div className={`fixed inset-0 z-90 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative transform transition-all duration-300 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        {/* Close button */}
        <button 
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 text-gray-600 hover:text-gray-800" 
          onClick={handleClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#473C66] mb-2">Welcome to Shithaa</h2>
          <p className="text-gray-600 text-sm">Elegant Maternity & Feeding Wear</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Google Login Button */}
        <div className="mb-6">
          <GoogleLoginButton onSuccess={() => { onSuccess(); onClose(); }} />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Quick & Secure Sign In</span>
          </div>
        </div>

        {/* Info Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Secure Google authentication</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No password required</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>One-click sign in</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-[#473C66] hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-[#473C66] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
} 