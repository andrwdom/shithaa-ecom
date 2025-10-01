"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { authenticatedFetch } from '@/lib/api-utils';

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
          const res = await authenticatedFetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/user/auth/profile');
          const data = await res.json();
          if (res.ok && data.data) {
            setMongoUser(data.data);
            // Show welcome message for new users
            if (firebaseUser.metadata?.creationTime && 
                new Date(firebaseUser.metadata.creationTime).getTime() > Date.now() - 60000) {
              toast.success(`🎉 Welcome to Shithaa, ${data.data.name || firebaseUser.displayName || 'there'}!`, {
                description: "You've been successfully signed in. Enjoy shopping!",
                duration: 5000,
                position: 'top-center',
              });
            }
            
            // Start proactive token refresh (refresh every 23 hours to stay ahead of 24-hour expiration)
            const startProactiveRefresh = () => {
              const refreshInterval = setInterval(async () => {
                try {
                  console.log('🔄 Proactively refreshing token...');
                  const refreshRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/refresh-token`,
                    {
                      method: 'POST',
                      credentials: 'include',
                    }
                  );
                  
                  if (refreshRes.ok) {
                    console.log('✅ Token proactively refreshed');
                  } else {
                    console.log('❌ Proactive token refresh failed');
                  }
                } catch (error) {
                  console.log('❌ Proactive token refresh error:', error);
                }
              }, 23 * 60 * 60 * 1000); // 23 hours
              
              // Clean up interval when component unmounts
              return () => clearInterval(refreshInterval);
            };
            
            startProactiveRefresh();
          } else if (res.status === 200 && !data.data) {
            // User not authenticated to backend (expected for new users)
            setMongoUser(null);
          } else {
            // Handle other errors (but not 401/403 which are expected)
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
        position: 'top-center',
      });

      console.log("Logout toast notification should have been shown");

      // SECURITY: Call backend logout to clear HttpOnly cookies
      try {
        await authenticatedFetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/user/logout', {
          method: 'POST'
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

  // Function to get ID token
  const getIdTokenFromAuth = async (forceRefresh: boolean = false) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    return await getIdToken(user, forceRefresh);
  };

  // Merge Firebase user and MongoDB user
  const mergedUser = user && mongoUser ? { ...user, mongoId: mongoUser._id, mongoEmail: mongoUser.email } : user;

  return (
    <AuthContext.Provider value={{ user: mergedUser, loading, logout, getIdToken: getIdTokenFromAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 