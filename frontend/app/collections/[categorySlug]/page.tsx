import { Metadata } from "next"
import CategoryPageClient from "./CategoryPageClient"

// SEO Metadata - This will be dynamic based on category
export const generateMetadata = async ({ params }: { params: Promise<{ categorySlug: string }> }): Promise<Metadata> => {
  const { categorySlug } = await params
  const categoryName = categorySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return {
    title: `${categoryName} Collection - Shinthaa`,
    description: `Discover our beautiful ${categoryName.toLowerCase()} collection at Shinthaa. Premium quality, comfortable designs for expecting mothers. Shop now for elegant maternity wear.`,
    keywords: [
      categoryName.toLowerCase(),
      "maternity wear",
      "feeding wear",
      "pregnancy clothes",
      "Shinthaa collection",
      "maternity fashion",
      "nursing wear"
    ],
    openGraph: {
      title: `${categoryName} Collection - Shinthaa`,
      description: `Discover our beautiful ${categoryName.toLowerCase()} collection at Shinthaa.`,
      images: ['/shitha-logo.jpg'],
    },
    twitter: {
      title: `${categoryName} Collection - Shinthaa`,
      description: `Discover our beautiful ${categoryName.toLowerCase()} collection at Shinthaa.`,
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params
  return <CategoryPageClient categorySlug={categorySlug} />
}
