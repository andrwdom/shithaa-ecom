"use client"
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart-context";
import { BuyNowProvider } from "@/components/buy-now-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <BuyNowProvider>{children}</BuyNowProvider>
      </CartProvider>
    </AuthProvider>
  );
} 