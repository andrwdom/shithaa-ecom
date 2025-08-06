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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <>
      {/* Only show navbar when not loading */}
      {!isLoading && (
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
      {/* Only show footer when not loading */}
      {!isLoading && <Footer />}
    </>
  );
} 