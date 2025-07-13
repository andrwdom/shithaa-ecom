"use client"
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export default function GoogleLoginButton({ onSuccess, mode = "login" }: { onSuccess: () => void, mode?: "login" | "signup" }) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      console.log("Attempting Google login...");
      await signInWithPopup(auth, new GoogleAuthProvider());
      console.log("Google login successful, getting ID token...");
      
      const idToken = await getIdToken(auth.currentUser);
      console.log("Got ID token, calling backend...");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      console.log("Backend response status:", res.status);
      const data = await res.json();
      console.log("Backend response:", data);
      
      if (data.success && data.data.token) {
        localStorage.setItem("token", data.data.token);
        console.log("Token stored in localStorage");
        toast.success(mode === "signup" ? "Successfully signed up! Welcome to Shitha Maternity." : "Successfully logged in. Welcome back!");
        onSuccess();
      } else {
        console.error("Backend Google login failed:", data.message);
        toast.error(data.message || "Google login failed. Please try again.");
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      toast.error(err.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-[#473C66] bg-white shadow-sm hover:bg-[#ede9f7] transition-all duration-150 font-semibold text-[#473C66] hover:text-[#36234d] focus:ring-2 focus:ring-[#473C66]/30 active:scale-95 group"
      onClick={handleGoogleLogin}
      disabled={loading}
      style={{ minHeight: 48 }}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow group-hover:scale-110 transition-transform duration-150">
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_17_40)">
            <path d="M47.5 24.5C47.5 22.6 47.3 20.8 46.9 19H24V29.1H37.6C36.9 32.2 34.8 34.7 31.8 36.3V42.1H39.3C44 38 47.5 31.9 47.5 24.5Z" fill="#4285F4"/>
            <path d="M24 48C30.6 48 36.2 45.9 39.3 42.1L31.8 36.3C30.1 37.4 27.9 38.1 24 38.1C17.7 38.1 12.2 33.9 10.3 28.3H2.5V34.3C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/>
            <path d="M10.3 28.3C9.7 26.2 9.7 24 9.7 21.9C9.7 19.8 9.7 17.6 10.3 15.5V9.5H2.5C0.9 12.6 0 16.2 0 19.9C0 23.6 0.9 27.2 2.5 30.3L10.3 28.3Z" fill="#FBBC05"/>
            <path d="M24 9.9C27.6 9.9 30.5 11.1 32.5 13L39.4 6.1C36.2 3.1 30.6 0 24 0C14.1 0 5.7 6.9 2.5 13.7L10.3 15.7C12.2 10.1 17.7 5.9 24 5.9V9.9Z" fill="#EA4335"/>
          </g>
          <defs>
            <clipPath id="clip0_17_40">
              <rect width="48" height="48" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </span>
      <span className="flex-1 text-center text-base font-medium tracking-wide">
        {loading ? <span className="loading loading-spinner"></span> : "Continue with Google"}
      </span>
    </button>
  );
} 