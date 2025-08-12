import { Metadata } from "next"
import CategoryPageClient from "./CategoryPageClient"
import Script from "next/script"

// SEO Metadata - This will be dynamic based on category
export const generateMetadata = async ({ params }: { params: Promise<{ categorySlug: string }> }): Promise<Metadata> => {
  const { categorySlug } = await params
  const categoryName = categorySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  // Enhanced SEO title and description with more targeted keywords
  const title = `${categoryName} Maternity Collection - Premium Maternity Wear | Shithaa`;
  const description = `Shop our premium ${categoryName.toLowerCase()} maternity collection. Comfortable, stylish designs for expecting mothers. Zipless feeding wear, elegant maternity dresses & more.`;

  return {
    title: title,
    description: description,
    keywords: [
      categoryName.toLowerCase(),
      "maternity wear",
      "feeding wear",
      "pregnancy clothes",
      "Shithaa collection",
      "maternity fashion",
      "nursing wear",
      "zipless feeding wear",
      "maternity dresses",
      "maternity clothing online",
      "premium maternity wear",
      "comfortable maternity clothes",
      "stylish maternity fashion",
      "maternity lounge wear"
    ],
    openGraph: {
      title: title,
      description: description,
      images: ['/shithaa-logo.jpg'],
      type: 'website',
      url: `https://shithaa.in/collections/${categorySlug}`,
    },
    twitter: {
      title: title,
      description: description,
      images: ['/shithaa-logo.jpg'],
      card: 'summary_large_image',
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params
  
  // Format category name for display
  const categoryName = categorySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  
  return (
    <>
      {/* Add BreadcrumbList structured data */}
      <Script
        id={`breadcrumb-schema-${categorySlug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://shithaa.in"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Collections",
                "item": "https://shithaa.in/collections"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": categoryName,
                "item": `https://shithaa.in/collections/${categorySlug}`
              }
            ]
          })
        }}
      />
      
      {/* Add CollectionPage structured data */}
      <Script
        id={`collection-schema-${categorySlug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": `${categoryName} Collection - Shithaa`,
            "description": `Shop our premium ${categoryName.toLowerCase()} maternity collection. Comfortable, stylish designs for expecting mothers.`,
            "url": `https://shithaa.in/collections/${categorySlug}`,
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "url": `https://shithaa.in/collections/${categorySlug}`
                }
              ]
            }
          })
        }}
      />
      
      <CategoryPageClient categorySlug={categorySlug} />
    </>
  )
}
