"use client"
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, getIdToken } from "firebase/auth";
import { toast } from "sonner";
import GoogleLoginButton from "./GoogleLoginButton";

export default function LoginModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email format validation
  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Handle login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      console.log("Attempting Firebase login...");
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login successful, getting ID token...");
      
      const idToken = await getIdToken(auth.currentUser);
      console.log("Got ID token, calling backend...");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
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
        
        // Enhanced welcome message
        const userName = result.user.displayName?.split(' ')[0] || 'there';
        toast.success(`👋 Welcome back, ${userName}!`, {
          description: "You've successfully signed in to Shithaa.",
          duration: 5000,
        });
        
        setEmail(""); setPassword(""); setName("");
        setError(null);
        onSuccess();
        onClose();
      } else {
        console.error("Backend login failed:", data.message);
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError("Account not found. Please sign up instead.");
        setTab("signup");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle signup
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      console.log("Attempting Firebase signup...");
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Firebase signup successful, updating profile...");
      
      await updateProfile(userCred.user, { displayName: name });
      console.log("Profile updated, getting ID token...");
      
      const idToken2 = await getIdToken(auth.currentUser);
      console.log("Got ID token, calling backend...");
      
      const res2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken2 }),
      });
      
      console.log("Backend response status:", res2.status);
      const data2 = await res2.json();
      console.log("Backend response:", data2);
      
      if (data2.success && data2.data.token) {
        localStorage.setItem("token", data2.data.token);
        console.log("Token stored in localStorage");
        
        // Enhanced welcome message
        const userName = name.split(' ')[0];
        toast.success(`🎉 Welcome to Shithaa, ${userName}!`, {
          description: "You've successfully signed up. Explore our elegant maternity wear collections now.",
          duration: 5000,
        });
        
        setEmail(""); setPassword(""); setName("");
        setError(null);
        onSuccess();
        onClose();
      } else {
        console.error("Backend signup failed:", data2.message);
        setError(data2.message || "Signup failed. Please try again.");
      }
    } catch (err: any) {
      console.error('Firebase signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please login instead.");
        setTab("login");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Reset fields on modal close
  function handleClose() {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
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

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            className={`flex-1 py-3 transition-all duration-200 font-medium ${
              tab === "login" 
                ? "text-[#473C66] border-b-2 border-[#473C66]" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => { setTab("login"); setError(null); }}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-3 transition-all duration-200 font-medium ${
              tab === "signup" 
                ? "text-[#473C66] border-b-2 border-[#473C66]" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => { setTab("signup"); setError(null); }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Google Login Button */}
        <div className="mb-6">
          <GoogleLoginButton onSuccess={() => { onSuccess(); onClose(); }} mode={tab} />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#473C66] focus:border-transparent transition-all duration-200"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#473C66] focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#473C66] focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#473C66] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#36234d] focus:ring-4 focus:ring-[#473C66]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{tab === "login" ? "Signing in..." : "Creating account..."}</span>
              </div>
            ) : (
              tab === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

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