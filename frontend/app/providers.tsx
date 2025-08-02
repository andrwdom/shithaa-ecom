"use client"
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart-context";
import { BuyNowProvider } from "@/components/buy-now-context";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <BuyNowProvider>
          {children}
          <Toaster />
        </BuyNowProvider>
      </CartProvider>
    </AuthProvider>
  );
} 