import { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"
import Script from "next/script"

// SEO Metadata - This will be dynamic based on product
export const generateMetadata = async ({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> => {
  try {
    const { productId } = await params
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products/' + productId;
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
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
    return {
      title: "Premium Maternity Wear - Shithaa",
      description: "Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers.",
    }
  }
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  
  // Fetch product data for structured data
  let productData = null;
  try {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products/' + productId;
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
    const data = await res.json();
    productData = data.data || data.product;
  } catch (error) {
    console.error("Error fetching product data for structured data:", error);
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
