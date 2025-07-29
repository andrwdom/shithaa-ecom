import { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"
import Script from "next/script"
import PageErrorBoundary from "@/components/page-error-boundary"
import { getApiUrl, serverFetch, fallbackMetadata, logError } from "@/lib/server-utils"

// SEO Metadata - This will be dynamic based on product
export const generateMetadata = async ({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> => {
  try {
    const { productId } = await params

    // Try to fetch product data, but don't fail if it doesn't work
    const apiUrl = `${getApiUrl()}/api/products/${productId}`;
    const res = await serverFetch(apiUrl, {
      next: { revalidate: 3600 } as any
    });

    if (res && res.ok) {
      const data = await res.json();
      const product = data.data || data.product;

      if (product) {
        // Enhanced SEO title and description with more keywords
        const title = `${product.name} - Premium Maternity Wear | Shithaa`;
        const description = `Shop ${product.name} - ${product.description || `Premium quality maternity wear designed for comfort and style. Perfect for expecting mothers. Free shipping on orders above ₹999.`}`;

        return {
          title: title,
          description: description,
          keywords: [
            product.name.toLowerCase(),
            product.category?.toLowerCase(),
            "maternity wear",
            "feeding wear",
            "pregnancy clothes",
            "Shithaa",
            "maternity fashion",
            "zipless feeding wear",
            "comfortable maternity clothing",
            "premium maternity dresses",
            "maternity lounge wear",
            "nursing clothes",
            "maternity wear online"
          ],
          openGraph: {
            title: title,
            description: description,
            images: product.images?.[0] ? [product.images[0]] : ['/shithaa-logo.jpg'],
            type: 'product',
            url: `https://shithaa.in/product/${productId}`,
          },
          twitter: {
            title: title,
            description: description,
            images: product.images?.[0] ? [product.images[0]] : ['/shitha-logo.jpg'],
            card: 'summary_large_image',
          },
        }
      }
    }

    // Fallback metadata if product fetch fails or product not found
    return fallbackMetadata;
  } catch (error) {
    logError("Error generating metadata for product:", error);
    return fallbackMetadata;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;

    // Try to fetch product data for structured data, but don't fail if it doesn't work
    let productData = null;
    try {
      const apiUrl = `${getApiUrl()}/api/products/${productId}`;
      const res = await serverFetch(apiUrl, {
        next: { revalidate: 3600 } as any
      });

      if (res && res.ok) {
        const data = await res.json();
        productData = data.data || data.product;
      }
    } catch (error) {
      logError("Error fetching product data for structured data:", error);
      // Continue without server-side data - the client will fetch it
    }
  
  return (
    <>
      {productData && (
        <Script
          id={`product-schema-${productId}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": productData.name,
              "image": productData.images?.[0] || "/shithaa-logo.jpg",
              "description": productData.description,
              "sku": productData._id,
              "brand": {
                "@type": "Brand",
                "name": "Shithaa"
              },
              "offers": {
                "@type": "Offer",
                "url": `https://shithaa.in/product/${productId}`,
                "priceCurrency": "INR",
                "price": productData.price,
                "availability": productData.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              },
              "aggregateRating": productData.rating > 0 ? {
                "@type": "AggregateRating",
                "ratingValue": productData.rating,
                "reviewCount": productData.reviews || 1
              } : undefined
            })
          }}
        />
      )}
      <PageErrorBoundary pageName="Product Page">
        <ProductPageClient productId={productId} />
      </PageErrorBoundary>
    </>
  )
  } catch (error) {
    logError("Critical error in ProductPage component:", error);
    // Return a minimal fallback that will still render
    return (
      <PageErrorBoundary pageName="Product Page (Fallback)">
        <ProductPageClient productId={(await params).productId} />
      </PageErrorBoundary>
    )
  }
}
