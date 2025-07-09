"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQ() {
  const faqs = [
    {
      question: "What sizes do you offer?",
      answer:
        "We offer sizes from S to XXL. Our maternity wear is designed to grow with you throughout your pregnancy and postpartum journey. We recommend checking our size guide for the perfect fit.",
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
      question: "Are your fabrics safe for sensitive skin?",
      answer:
        "We use premium, hypoallergenic fabrics like organic cotton and bamboo fiber that are gentle on sensitive skin. All our materials are tested for safety and comfort.",
    },
  ]

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600">Everything you need to know about our products and services</p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="bg-white rounded-lg shadow-sm border-0 px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-pink-500 transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
