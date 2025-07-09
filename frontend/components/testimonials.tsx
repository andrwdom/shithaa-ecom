"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Star, Shield, RotateCcw, Truck } from "lucide-react"
import Image from "next/image"

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Priya Sharma",
      location: "Mumbai",
      rating: 5,
      text: "The zipless feeding wear is a game-changer! So comfortable and practical for new moms like me.",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      id: 2,
      name: "Anita Patel",
      location: "Delhi",
      rating: 5,
      text: "Beautiful quality and perfect fit. The fabric is so soft and breathable. Highly recommended!",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      id: 3,
      name: "Kavya Reddy",
      location: "Bangalore",
      rating: 5,
      text: "Love the elegant designs! Finally maternity wear that makes me feel beautiful and confident.",
      image: "/placeholder.svg?height=60&width=60",
    },
  ]

  const trustBadges = [
    {
      icon: Truck,
      title: "Cash on Delivery Available",
      description: "Pay when you receive",
    },
    {
      icon: Shield,
      title: "Secure Shopping",
      description: "100% safe & secure",
    },
    {
      icon: RotateCcw,
      title: "7-Day Return",
      description: "Easy returns & exchanges",
    },
  ]

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Testimonials */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">What Our Mothers Say</h2>
          <p className="text-lg text-gray-600">Real experiences from real mothers</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Image
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>

                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-600 italic">"{testimonial.text}"</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-8">
          <div className="grid md:grid-cols-3 gap-8">
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Icon className="h-8 w-8 text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{badge.title}</h3>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
