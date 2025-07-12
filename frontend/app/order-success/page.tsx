import { Metadata } from "next";
import OrderSuccessClient from "./OrderSuccessClient";

// SEO Metadata for order success page
export const metadata: Metadata = {
  title: "Order Confirmed - Shinthaa",
  description: "Your order has been successfully placed. Thank you for choosing Shinthaa for your maternity wear needs.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function OrderSuccess() {
  return <OrderSuccessClient />
} 