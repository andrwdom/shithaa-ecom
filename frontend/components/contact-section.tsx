"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Instagram, Mail, Clock, Send, MessageCircle, Heart, Star } from "lucide-react"

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Submit to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // Reset form
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        })
        alert("Thank you for your message! We'll get back to you via email within 24 hours.")
      } else {
        throw new Error('Failed to submit contact form')
      }
    } catch (error) {
      console.error('Contact form submission error:', error)
      alert("Sorry, there was an error submitting your message. Please try again or contact us directly via Instagram.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactMethods = [
    {
      icon: Mail,
      title: "General Inquiries",
      subtitle: "Questions about products, orders, or shipping",
      value: "info.shithaa@gmail.com",
      action: () => window.open("mailto:info.shithaa@gmail.com"),
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      hoverColor: "hover:bg-purple-100",
      subValue: undefined,
    },
    {
      icon: Instagram,
      title: "Instagram Support",
      subtitle: "Quick questions and product assistance",
      value: "@shithaa.in",
      action: () => window.open("https://www.instagram.com/shithaa.in", "_blank"),
      bgColor: "bg-pink-50",
      iconColor: "text-pink-600",
      hoverColor: "hover:bg-pink-100",
      subValue: undefined,
    },

  ]

  return (
    <section
      id="contact"
      className="px-4 sm:px-6 lg:px-8 py-16 lg:py-20 bg-gradient-to-br from-pink-50 via-white to-purple-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="h-6 w-6 text-pink-500" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 font-serif">Get In Touch</h2>
            <Heart className="h-6 w-6 text-pink-500" />
          </div>
          <p className="text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
            We'd love to hear from you! Whether you have questions about our products, need styling advice, or want to
            share your motherhood journey with us.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Methods */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Let's Connect</h3>
              <p className="text-gray-600 mb-6">
                Choose the way that works best for you. We're here to support you every step of your journey.
              </p>
              
              {/* Quick Guide */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 mb-8">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Quick Guide
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">🔄 Refunds & Exchanges:</span> Instagram DM (fastest response)</p>
                  <p><span className="font-medium">❓ Product Questions:</span> Instagram DM or form below</p>
                  <p><span className="font-medium">📝 General Inquiries:</span> Contact form below</p>
                </div>
              </div>
            </div>

            {/* Contact Cards */}
            <div className="grid gap-4">
              {contactMethods.map((method, index) => {
                const Icon = method.icon
                return (
                  <Card
                    key={index}
                    className={`border-0 shadow-md ${method.bgColor} ${method.hoverColor} transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:shadow-lg`}
                    onClick={method.action}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-xl bg-white shadow-sm`}>
                          <Icon className={`h-6 w-6 ${method.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">{method.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{method.subtitle}</p>
                          <p className="font-semibold text-gray-900">{method.value}</p>
                          {method.subValue && <p className="text-sm text-gray-700">{method.subValue}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>



            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-[rgb(71,60,102)] mb-1">24hrs</div>
                <div className="text-sm text-gray-600">Response Time</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-2xl font-bold text-[rgb(71,60,102)]">4.9</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="text-sm text-gray-600">Customer Rating</div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="border-0 shadow-xl bg-white">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Send us a Message</h3>
                  <p className="text-gray-600">
                    Have a specific question? Fill out the form below and we'll get back to you personally.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        required
                        className="h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        required
                        className="h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="What's this about?"
                      required
                      className="h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Message *</label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      required
                      rows={5}
                      className="border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Message
                      </div>
                    )}
                  </Button>
                </form>

                {/* Customer Support CTA */}
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-pink-800">Quick Questions or Product Help?</p>
                        <p className="text-xs text-pink-600">Instagram DM for fastest response on general inquiries!</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg"
                        onClick={() => window.open("https://www.instagram.com/shithaa.in", "_blank")}
                      >
                        DM Us Now
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-600">
                    <p>💝 For product questions, sizing help, or general inquiries - Instagram DM gets the fastest response!</p>
                    <p className="text-xs mt-1">📧 For detailed questions or order support, use the form above and we'll email you back within 24 hours.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


      </div>
    </section>
  )
}
