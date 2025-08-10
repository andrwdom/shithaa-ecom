import { Metadata } from "next"
import SizingGuideClient from "./SizingGuideClient"

export const metadata: Metadata = {
  title: "Size Guide - Shithaa Maternity Wear",
  description: "Find your perfect fit with our comprehensive size guide for maternity wear and zipless feeding loungewear. Get accurate measurements and sizing charts.",
  keywords: "maternity size guide, pregnancy clothing sizes, maternity wear sizing, zipless feeding size chart",
}

export default function SizingGuidePage() {
  return <SizingGuideClient />
} 