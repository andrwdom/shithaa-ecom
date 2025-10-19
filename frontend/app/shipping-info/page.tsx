import React from "react";
import { Metadata } from "next";
import styles from '../styles/informational-pages.module.css';

// SEO Metadata for shipping info page
export const metadata: Metadata = {
  title: "Shipping Information - Shithaa",
  description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
  keywords: [
    "shipping information",
    "delivery times",
    "shipping policy",
    "maternity wear shipping",
    "Shithaa delivery",
    "shipping costs",
    "Tamil Nadu shipping",
    "Puducherry shipping",
    "Pondicherry shipping",
    "India shipping"
  ],
  openGraph: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Shipping Information - Shithaa",
    description: "Learn about Shithaa's shipping policies, delivery times, and shipping costs. Shipping costs vary by location and product category.",
  },
}

export default function ShippingInfoPage() {
  return (
    <main className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <h1 className={styles.pageTitle}>Shipping Information</h1>
        
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V8z" />
            </svg>
            <h2 className={styles.cardTitle}>Fast & Reliable Delivery</h2>
          </div>
          <p className={styles.cardContent}>Products will be delivered within 3-4 working days across India</p>
        </div>

        <div className={styles.cardGrid}>
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className={styles.cardTitle}>Tamil Nadu & Puducherry Shipping</h3>
            </div>
            <p className={styles.cardContent}>
              <span className={styles.emphasis}>Free shipping</span> for most categories within Tamil Nadu and Puducherry/Pondicherry. 
              Maternity Feeding Wear has tiered shipping costs based on quantity.
            </p>
          </div>
          
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className={styles.cardTitle}>Other States Shipping</h3>
            </div>
            <p className={styles.cardContent}>
              Shipping costs apply for all states outside Tamil Nadu and Puducherry. 
              Costs vary by product category and quantity.
            </p>
          </div>
        </div>



        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className={styles.cardTitle}>Delivery Areas</h3>
          </div>
          <p className={styles.cardContent}>We deliver to all major cities and towns across India. Remote areas may take 1-2 additional days.</p>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={styles.cardTitle}>Order Tracking</h3>
          </div>
          <p className={styles.cardContent}>You'll receive SMS and email updates with tracking information once your order ships.</p>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className={styles.cardTitle}>How Shipping is Calculated</h3>
          </div>
          <p className={styles.cardContent}>
            Shipping costs are automatically calculated during checkout based on:
          </p>
          <ul className={styles.cardList}>
            <li className={styles.cardListItem}>Your delivery location (state)</li>
            <li className={styles.cardListItem}>Product categories in your cart</li>
            <li className={styles.cardListItem}>Total quantity of items</li>
            <li className={styles.cardListItem}>Our backend shipping rules</li>
          </ul>
        </div>

        <div className={styles.footerNote}>
          <p>
            For any shipping-related questions, contact us at{" "}
            <a href="mailto:info.shithaa@gmail.com" className={styles.link}>
              info.shithaa@gmail.com
            </a>{" "}
            or DM us on Instagram for faster response.
          </p>
        </div>
      </div>
    </main>
  );
}