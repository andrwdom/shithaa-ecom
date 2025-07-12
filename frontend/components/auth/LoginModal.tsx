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
      await signInWithEmailAndPassword(auth, email, password);
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
        toast.success("Successfully logged in. Welcome back!");
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
        toast.success("Successfully signed up! Welcome to Shitha Maternity.");
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${open ? "" : "hidden"}`}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative animate-fade-in">
        <button className="absolute top-2 right-2 btn btn-ghost btn-sm" onClick={handleClose}>&times;</button>
        <div className="flex mb-4 border-b">
          <button
            className={`flex-1 py-2 transition-all duration-150 ${tab === "login" ? "font-bold border-b-2 border-[#473C66] text-[#473C66]" : "text-gray-500"}`}
            onClick={() => { setTab("login"); setError(null); }}
            type="button"
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 transition-all duration-150 ${tab === "signup" ? "font-bold border-b-2 border-[#473C66] text-[#473C66]" : "text-gray-500"}`}
            onClick={() => { setTab("signup"); setError(null); }}
            type="button"
          >
            Sign Up
          </button>
        </div>
        {/* Only Google login/signup allowed */}
        <div className="flex flex-col items-center justify-center py-8">
          <GoogleLoginButton onSuccess={() => { onSuccess(); onClose(); }} />
        </div>
      </div>
    </div>
  );
} 