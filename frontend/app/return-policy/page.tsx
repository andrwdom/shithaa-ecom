import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Metadata } from 'next'
import styles from '../styles/informational-pages.module.css'

// SEO Metadata for return policy page
export const metadata: Metadata = {
  title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
  description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products. Contact us via Instagram DM or email.",
  keywords: [
    "return policy",
    "refund policy",
    "exchange policy",
    "damaged products",
    "product returns",
    "Shithaa returns",
    "maternity wear returns",
    "maternity clothing returns",
    "premium clothing returns"
  ],
  openGraph: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
    description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products.",
    images: ['/shithaa-logo.jpg'],
  },
  twitter: {
    title: "Return Policy - Shithaa | Premium Maternity Wear Returns & Exchanges",
    description: "Learn about Shithaa's refund and exchange policy. Refunds and exchanges are only applicable for damaged products.",
  },
}

export default function ReturnPolicyPage() {
  return (
    <main className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <h1 className={styles.pageTitle}>Return & Exchange Policy</h1>
        
        <p className={styles.pageDescription}>
          At Shithaa, we are committed to providing you with the highest quality maternity wear. 
          Our refund and exchange policy is designed to ensure customer satisfaction while maintaining 
          the integrity of our products.
        </p>
        
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className={styles.cardTitle}>Important Refund Criteria</h3>
          </div>
          <ul className={styles.cardList}>
            <li className={styles.cardListItem}>Refunds are <span className={styles.emphasis}>only</span> available for damaged or defective products</li>
            <li className={styles.cardListItem}>Products must be in original, unused condition</li>
            <li className={styles.cardListItem}>Refund requests must be made within <span className={styles.emphasis}>2 days</span> of receiving your order</li>
            <li className={styles.cardListItem}>All refunds are subject to review and approval</li>
          </ul>
        </div>

        <div className={styles.cardGrid}>
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className={styles.cardTitle}>Time Limit for Claims</h3>
            </div>
            <p className={styles.cardContent}>
              All refund and exchange requests must be submitted within <span className={styles.emphasis}>2 days of receiving your order</span>. 
              Claims made after this period will not be considered.
            </p>
          </div>
          
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className={styles.cardTitle}>Evidence Requirements</h3>
            </div>
            <p className={styles.cardContent}>
              To process your claim, we require <span className={styles.emphasis}>video evidence without pause</span> clearly showing the damage or defect. 
              Photos may also be requested as additional documentation.
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={styles.cardTitle}>Eligibility Criteria</h3>
          </div>
          <ul className={styles.cardList}>
            <li className={styles.cardListItem}><span className={styles.strong}>Product must be damaged or defective</span> upon delivery</li>
            <li className={styles.cardListItem}><span className={styles.strong}>Video evidence without pause</span> must be provided</li>
            <li className={styles.cardListItem}>Product must be in original, unworn condition</li>
            <li className={styles.cardListItem}>Original packaging and tags must be intact</li>
            <li className={styles.cardListItem}>Claim must be submitted within 2 days of delivery</li>
            <li className={styles.cardListItem}>Original invoice or order confirmation must be included</li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h3 className={styles.cardTitle}>What We Don't Accept</h3>
          </div>
          <ul className={styles.cardList}>
            <li className={styles.cardListItem}>Change of mind or preference</li>
            <li className={styles.cardListItem}>Incorrect size selection by customer</li>
            <li className={styles.cardListItem}>Products worn or used after delivery</li>
            <li className={styles.cardListItem}>Claims submitted after 2 days</li>
            <li className={styles.cardListItem}>Products without proper video evidence</li>
            <li className={styles.cardListItem}>Items returned without original packaging</li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={styles.cardTitle}>How to Submit a Claim</h3>
          </div>
          <p className={styles.cardContent}>
            To request a refund or exchange for a damaged product, please follow these steps:
          </p>
          <ol className={styles.orderedList}>
            <li className={styles.orderedListItem}><span className={styles.strong}>Document the damage immediately</span> - Take a video without pause showing the defect</li>
            <li className={styles.orderedListItem}><span className={styles.strong}>Contact us within 2 days</span> of receiving your order</li>
            <li className={styles.orderedListItem}><span className={styles.strong}>Provide video evidence</span> and order details</li>
            <li className={styles.orderedListItem}><span className={styles.strong}>Wait for our assessment</span> and response</li>
          </ol>
          <p className={styles.cardContent}>
            Contact us via Instagram direct message at{" "}
            <a href="https://www.instagram.com/shithaa.in" className={styles.link} target="_blank" rel="noopener noreferrer">
              @shithaa.in
            </a>{" "}
            (preferred method) or email us at{" "}
            <a href="mailto:info.shithaa@gmail.com" className={styles.link}>
              info.shithaa@gmail.com
            </a>
          </p>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className={styles.cardTitle}>Processing Time</h3>
          </div>
          <p className={styles.cardContent}>
            Once we receive your claim with proper video evidence, we will review it within <span className={styles.emphasis}>24-48 hours</span>. 
            If approved, refunds will be processed within <span className={styles.emphasis}>5-7 business days</span> to your original payment method.
          </p>
        </div>

        <div className={styles.footerNote}>
          <p>
            For any questions about our return and exchange policy, please don't hesitate to contact us. 
            We're here to ensure your satisfaction with our products.
          </p>
        </div>
      </div>
    </main>
  )
}