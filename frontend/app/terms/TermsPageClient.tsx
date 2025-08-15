"use client"

import styles from '../styles/informational-pages.module.css';

export default function TermsPageClient() {
  return (
    <main className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <button
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className={styles.pageTitle}>Terms and Conditions</h1>
        
        <div className={styles.infoCard}>
          <p className={styles.cardContent}>
            Welcome to Shithaa.in. These Terms and Conditions ("Terms") govern your use of our website located at www.shithaa.in and the services we offer. By accessing or using the Site, you agree to be bound by these Terms.
          </p>
        </div>

        <div className={styles.infoCard}>
          <ol className={styles.orderedList}>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>General Information</span><br />
              This website is operated by S KARTHIKA. Throughout the site, the terms "we", "us" and "our" refer to Shithaa.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Use of Our Website</span><br />
              By using this website, you represent that you are at least the age of majority in your state or province of residence. You agree not to use our products for any illegal or unauthorized purpose.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Products & Pricing</span><br />
              All dresses and related products are subject to availability.<br />
              We reserve the right to change prices and product descriptions at any time without notice.<br />
              We try to display product colors accurately, but cannot guarantee your device's display will reflect colors exactly.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Orders</span><br />
              Once you place an order, you will receive an order confirmation via email or SMS.<br />
              We reserve the right to refuse or cancel any order at our discretion.<br />
              If your order is canceled after payment, we will initiate a full refund.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Shipping & Delivery</span><br />
              Products will be delivered within 3-4 working days.<br />
              Delivery times vary depending on your location.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Returns & Refunds</span><br />
              We offer refunds only if the delivered product is damaged or defective.<br />
              Items must be unused and in original packaging.<br />
              Refunds and exchanges are only applicable for damaged products. Contact us via Instagram direct message (preferred) or email us at <a href="mailto:info.shithaa@gmail.com" className={styles.link}>info.shithaa@gmail.com</a>. Refund requests made after 2 days from the date you receive your order will not be eligible.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Intellectual Property</span><br />
              All content on this website (images, text, design, logo, etc.) is the property of Shithaa and may not be copied or used without written permission.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Limitation of Liability</span><br />
              We are not liable for any direct, indirect, incidental, or consequential damages resulting from your use of our website or products.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Changes to Terms</span><br />
              We reserve the right to update or change these Terms at any time. Continued use of the site following changes means you accept the new terms.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Contact Information</span><br />
              <span className={styles.strong}>Contact Information:</span><br />
              Email: <a href="mailto:info.shithaa@gmail.com" className={styles.link}>info.shithaa@gmail.com</a><br />
              Instagram: <a href="https://www.instagram.com/shithaa.in" className={styles.link}>@shithaa.in</a>
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}