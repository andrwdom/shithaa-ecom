"use client"

import styles from '../styles/informational-pages.module.css';

export default function PrivacyPolicyPageClient() {
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
        
        <h1 className={styles.pageTitle}>Privacy Policy</h1>
        
        <div className={styles.infoCard}>
          <ol className={styles.orderedList}>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Introduction</span><br/>
              At Shithaa we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your data when you visit or make a purchase from our premium maternity wear website.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Information We Collect</span><br/>
              <ul className={styles.cardList}>
                <li className={styles.cardListItem}>Personal Information: Name, email address, shipping address, phone number, and payment details.</li>
                <li className={styles.cardListItem}>Non-Personal Information: IP address, browser type, device information, and browsing behavior.</li>
              </ul>
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>How We Use Your Information</span><br/>
              We use your information to:
              <ul className={styles.cardList}>
                <li className={styles.cardListItem}>Process and fulfill your orders</li>
                <li className={styles.cardListItem}>Communicate with you about your orders or inquiries</li>
                <li className={styles.cardListItem}>Improve our website and customer service</li>
                <li className={styles.cardListItem}>Send promotional emails (if you opt-in)</li>
              </ul>
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Sharing Your Information</span><br/>
              We do not sell or rent your personal information to third parties. We may share your data with:
              <ul className={styles.cardList}>
                <li className={styles.cardListItem}>Service providers (e.g., shipping companies, payment processors)</li>
                <li className={styles.cardListItem}>Law enforcement, if required by law</li>
              </ul>
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Data Security</span><br/>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Your Rights</span><br/>
              You have the right to:
              <ul className={styles.cardList}>
                <li className={styles.cardListItem}>Access the personal information we hold about you</li>
                <li className={styles.cardListItem}>Request correction or deletion of your data</li>
                <li className={styles.cardListItem}>Withdraw consent for data processing (where applicable)</li>
              </ul>
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Cookies</span><br/>
              We use cookies to improve your browsing experience and analyze website traffic. You can disable cookies in your browser settings if you prefer not to share this data.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Changes to This Privacy Policy</span><br/>
              We may update this policy from time to time. Any changes will be posted on this page with the updated date.
            </li>
            <li className={styles.orderedListItem}>
              <span className={styles.strong}>Contact Us</span><br/>
              If you have any questions about this Privacy Policy, please contact us at:<br/>
              Email: <a href="mailto:info.shithaa@gmail.com" className={styles.link}>info.shithaa@gmail.com</a><br/>
              Instagram: <a href="https://www.instagram.com/shithaa.in" className={styles.link}>@shithaa.in</a>
            </li>
          </ol>
        </div>
      </div>
    </main>
  )
}