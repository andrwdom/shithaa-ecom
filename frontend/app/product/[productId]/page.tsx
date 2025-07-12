import { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"

// SEO Metadata - This will be dynamic based on product
export const generateMetadata = async ({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> => {
  try {
    const { productId } = await params
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products/' + productId;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const product = data.data || data.product;
    
    if (!product) {
      return {
        title: "Product Not Found - Shinthaa",
        description: "The requested product could not be found.",
      }
    }

    return {
      title: `${product.name} - Shinthaa`,
      description: product.description || `Discover ${product.name} at Shinthaa. Premium quality maternity wear designed with love for expecting mothers.`,
      keywords: [
        product.name.toLowerCase(),
        product.category?.toLowerCase(),
        "maternity wear",
        "feeding wear",
        "pregnancy clothes",
        "Shinthaa",
        "maternity fashion"
      ],
      openGraph: {
        title: `${product.name} - Shinthaa`,
        description: product.description || `Discover ${product.name} at Shinthaa.`,
        images: product.images?.[0] ? [product.images[0]] : ['/shitha-logo.jpg'],
      },
      twitter: {
        title: `${product.name} - Shinthaa`,
        description: product.description || `Discover ${product.name} at Shinthaa.`,
        images: product.images?.[0] ? [product.images[0]] : ['/shitha-logo.jpg'],
      },
    }
  } catch (error) {
    return {
      title: "Product - Shinthaa",
      description: "Discover premium maternity wear at Shinthaa.",
    }
  }
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  return <ProductPageClient productId={productId} />
}
