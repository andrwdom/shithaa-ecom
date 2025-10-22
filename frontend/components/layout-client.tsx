"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CategorySidebar from "@/components/category-sidebar";
import { usePathname } from "next/navigation";
import { useLoading } from "@/components/loading-context";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isLoading } = useLoading();

  // Hide navbar and footer during checkout for cleaner experience
  const isCheckoutPage = pathname?.startsWith('/checkout');
  
  // Don't hide navbar during page loading - only hide during checkout
  const shouldShowNavbar = !isCheckoutPage;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <>
      {/* Show navbar on all pages except checkout */}
      {shouldShowNavbar && (
        <>
          <Navbar onCategoriesClick={() => setIsCategorySidebarOpen(true)} />
          <CategorySidebar
            isOpen={isCategorySidebarOpen}
            onClose={() => setIsCategorySidebarOpen(false)}
            onCategorySelect={(slug) => {
              setIsCategorySidebarOpen(false);
              window.location.href = `/collections/${slug}`;
            }}
          />
        </>
      )}
      <main className="flex-1 flex flex-col">{children}</main>
      {/* Show footer on all pages except checkout */}
      {shouldShowNavbar && <Footer />}
    </>
  );
} 