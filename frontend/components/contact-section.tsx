"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Instagram, Mail, MapPin, Clock, Send, MessageCircle, Heart, Star } from "lucide-react"

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Create WhatsApp message
    const message = `Hi Shitha Team!

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Subject: ${formData.subject}

Message: ${formData.message}

Looking forward to hearing from you!`

    const whatsappUrl = `https://wa.me/918148480720?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    })

    setIsSubmitting(false)
    alert("Thank you for your message! We'll get back to you soon.")
  }

  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      subtitle: "Mon-Sat, 9 AM - 7 PM",
      value: "+91 8148480720",
      action: () => window.open("tel:+918148480720"),
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      hoverColor: "hover:bg-blue-100",
    },
    {
      icon: Instagram,
      title: "Follow Us",
      subtitle: "Latest updates & styles",
      value: "@shitha_clothing",
      action: () => window.open("https://www.instagram.com/shitha_clothing?igsh=NHF6YjEyYjUyMzJj", "_blank"),
      bgColor: "bg-pink-50",
      iconColor: "text-pink-600",
      hoverColor: "hover:bg-pink-100",
    },
    {
      icon: Mail,
      title: "Email Us",
      subtitle: "We reply within 24 hours",
      value: "info.shitha@gmail.com",
      action: () => window.open("mailto:info.shitha@gmail.com"),
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      hoverColor: "hover:bg-purple-100",
    },
    {
      icon: MapPin,
      title: "Visit Our Store",
      subtitle: "Come see our collection",
      value: "118/a, Mahalingapuram, Vellalore",
      subValue: "Coimbatore 641111",
      action: () =>
        window.open("https://maps.google.com/?q=118/a,+Mahalingapuram,+Vellalore,+Coimbatore+641111", "_blank"),
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      hoverColor: "hover:bg-green-100",
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
              <p className="text-gray-600 mb-8">
                Choose the way that works best for you. We're here to support you every step of your journey.
              </p>
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

            {/* Store Hours */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-white shadow-sm">
                    <Clock className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Store Hours</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monday - Saturday</span>
                        <span className="font-medium text-gray-900">9:00 AM - 7:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sunday</span>
                        <span className="font-medium text-gray-900">10:00 AM - 6:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                        className="h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-xl"
                      />
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

                {/* WhatsApp CTA */}
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">Prefer WhatsApp?</p>
                      <p className="text-xs text-green-600">Get instant responses on WhatsApp</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      onClick={() => window.open("https://wa.me/918148480720", "_blank")}
                    >
                      Chat Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 lg:mt-20">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12 max-w-4xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 font-serif">
              Ready to Experience Shitha Quality?
            </h3>
            <p className="text-gray-600 mb-6 lg:mb-8 max-w-2xl mx-auto">
              Visit our store to feel the premium fabrics, try on our designs, and get personalized styling advice from
              our expert team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() =>
                  window.open(
                    "https://maps.google.com/?q=118/a,+Mahalingapuram,+Vellalore,+Coimbatore+641111",
                    "_blank",
                  )
                }
                className="bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white px-8 py-3 rounded-xl font-semibold"
              >
                <MapPin className="h-5 w-5 mr-2" />
                Get Directions
              </Button>
              <Button
                onClick={() => window.open("tel:+918148480720")}
                variant="outline"
                className="border-2 border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white px-8 py-3 rounded-xl font-semibold bg-transparent"
              >
                <Phone className="h-5 w-5 mr-2" />
                Call to Visit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
