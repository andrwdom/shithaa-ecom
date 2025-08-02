"use client"
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart-context";
import { BuyNowProvider } from "@/components/buy-now-context";
import { WishlistProvider } from "@/components/wishlist-context";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <BuyNowProvider>
          <WishlistProvider>
            {children}
            <Toaster />
          </WishlistProvider>
        </BuyNowProvider>
      </CartProvider>
    </AuthProvider>
  );
} 