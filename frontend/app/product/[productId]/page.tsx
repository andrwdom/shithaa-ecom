import { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"
import Script from "next/script"
import { getApiUrl, serverFetch, fallbackMetadata, logError } from "@/lib/server-utils"

// SEO Metadata - This will be dynamic based on product
export const generateMetadata = async ({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> => {
  try {
    const { productId } = await params

    const apiUrl = `${getApiUrl()}/api/products/${productId}`;
    const res = await serverFetch(apiUrl, {
      next: { revalidate: 3600 } as any
    });

    if (!res || !res.ok) {
      throw new Error(`Failed to fetch product: ${res?.status || 'Network error'}`);
    }

    const data = await res.json();
    const product = data.data || data.product;

    if (!product) {
      return {
        title: "Product Not Found - Shithaa",
        description: "The requested product could not be found.",
      }
    }

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
  } catch (error) {
    logError("Error generating metadata for product:", error);
    return fallbackMetadata;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  
  // Fetch product data for structured data
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
      <ProductPageClient productId={productId} />
    </>
  )
}
