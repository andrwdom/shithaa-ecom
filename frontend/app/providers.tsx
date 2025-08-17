"use client"
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart-context";
import { BuyNowProvider } from "@/components/buy-now-context";
import { CheckoutFlowProvider } from "@/components/checkout-flow-manager";
import { WishlistProvider } from "@/components/wishlist-context";
import { LoadingProvider } from "@/components/loading-context";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoadingProvider>
      <AuthProvider>
        <CartProvider>
          <BuyNowProvider>
            <CheckoutFlowProvider>
              <WishlistProvider>
                {children}
                <Toaster />
              </WishlistProvider>
            </CheckoutFlowProvider>
          </BuyNowProvider>
        </CartProvider>
      </AuthProvider>
    </LoadingProvider>
  );
} 