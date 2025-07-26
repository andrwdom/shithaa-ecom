"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Script from "next/script"

export default function FAQAccordion() {
  const faqs = [
    {
      question: "What sizes do you offer?",
      answer:
        "We offer sizes from S to XXL. Our maternity wear is designed to grow with you throughout your pregnancy and postpartum journey. Check our size guide for the perfect fit.",
    },
    {
      question: "How does the zipless feeding feature work?",
      answer:
        "Our revolutionary zipless design features hidden panels and strategic openings that provide easy feeding access without compromising on style or comfort. The design is discreet and maintains the garment's elegant appearance.",
    },
    {
      question: "What is your return policy?",
      answer:
        "We offer a 7-day return policy from the date of delivery. Items must be in original condition with tags attached. We provide free returns for defective items and easy exchanges for size issues.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Standard delivery takes 3-5 business days across major cities. For remote locations, it may take 5-7 business days. We also offer express delivery options for urgent orders.",
    },
    {
      question: "Are your maternity clothes suitable for all stages of pregnancy?",
      answer:
        "Yes, our maternity wear is designed to adapt to your changing body throughout all trimesters. The stretchy, comfortable fabrics and thoughtful designs ensure a perfect fit from early pregnancy through postpartum.",
    },
    {
      question: "Do you offer maternity wear for special occasions?",
      answer:
        "Absolutely! We have an elegant collection of maternity dresses perfect for special occasions, from formal events to casual gatherings. Our designs combine style with comfort for the modern expecting mother.",
    },
  ]

  // Prepare FAQ structured data
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-white">
      {/* Add FAQ structured data */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">
            Frequently Asked Questions About Maternity Wear
          </h2>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about our premium maternity clothing and services
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3 lg:space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-gray-50 rounded-2xl border border-gray-200 px-4 lg:px-6 hover:shadow-md transition-all duration-300"
            >
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-gray-700 transition-colors py-4 lg:py-6 font-serif text-base lg:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4 lg:pb-6 leading-relaxed text-sm lg:text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
