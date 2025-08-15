"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mongoUser, setMongoUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user");
      setUser(firebaseUser);
      setLoading(false);
      // SECURITY: Fetch backend user profile using HttpOnly cookies
      if (firebaseUser) {
        try {
          const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/user/auth/profile', {
            credentials: 'include' // SECURITY: Send cookies with request
          });
          const data = await res.json();
          if (res.ok && data.data) {
            setMongoUser(data.data);
          } else {
            // Silently handle 401/403 errors - user might not be logged in to backend
            if (res.status !== 401 && res.status !== 403) {
              console.warn('Profile fetch failed:', data.message);
            }
            setMongoUser(null);
          }
        } catch (e) {
          // Silently handle network errors
          setMongoUser(null);
        }
      } else {
        setMongoUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  async function logout() {
    try {
      const userName = user?.displayName?.split(' ')[0] || 'there';
      
      console.log("About to show logout toast notification...", { userName });
      
      // Show logout confirmation toast
      toast.success(`👋 Goodbye, ${userName}!`, {
        description: "You've been logged out successfully. Please sign in again to continue.",
        duration: 4000,
      });

      console.log("Logout toast notification should have been shown");

      // SECURITY: Call backend logout to clear HttpOnly cookies
      try {
        await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/user/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.warn('Backend logout failed:', e);
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("There was an issue logging out. Please try again.");
    }
  }

  // Merge Firebase user and MongoDB user
  const mergedUser = user && mongoUser ? { ...user, mongoId: mongoUser._id, mongoEmail: mongoUser.email } : user;

  return (
    <AuthContext.Provider value={{ user: mergedUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 