"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';

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
      // Fetch backend user profile if logged in
      if (firebaseUser) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/user/auth/profile', {
              headers: { token }
            });
            const data = await res.json();
            if (res.ok && data.data) {
              setMongoUser(data.data);
            } else {
              setMongoUser(null);
            }
          } catch (e) {
            setMongoUser(null);
          }
        } else {
          setMongoUser(null);
        }
      } else {
        setMongoUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    return signOut(auth);
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