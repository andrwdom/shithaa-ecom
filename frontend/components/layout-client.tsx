"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CategorySidebar from "@/components/category-sidebar";
import { usePathname } from "next/navigation";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
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
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
} 