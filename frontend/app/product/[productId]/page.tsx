import { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"
import PageErrorBoundary from "@/components/page-error-boundary"

// SEO Metadata - This will be dynamic based on product
export const generateMetadata = async ({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> => {
  // Return static metadata to prevent server-side rendering errors
  return {
    title: "Premium Maternity Wear - Shithaa",
    description: "Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers.",
    openGraph: {
      title: "Premium Maternity Wear - Shithaa",
      description: "Discover elegant maternity wear and feeding essentials at Shithaa.",
      images: ['/shithaa-logo.jpg'],
      type: 'product',
    },
    twitter: {
      title: "Premium Maternity Wear - Shithaa",
      description: "Discover elegant maternity wear and feeding essentials at Shithaa.",
      images: ['/shithaa-logo.jpg'],
      card: 'summary_large_image',
    },
  }
}

export default function ProductPage({ params }: { params: { productId: string } }) {
  const { productId } = params;

  return (
    <PageErrorBoundary pageName="Product Page">
      <ProductPageClient productId={productId} />
    </PageErrorBoundary>
  );
}
