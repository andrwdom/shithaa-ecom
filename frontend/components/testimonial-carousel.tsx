"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const testimonials = [
    {
      id: 1,
      name: "Priya Sharma",
      location: "Mumbai",
      rating: 5,
      text: "Finally, feeding wear that actually works! No more struggling with zippers at 3 AM. This has been a game-changer for my postpartum journey.",
      image: "/placeholder.svg?height=80&width=80",
      verified: true,
    },
    {
      id: 2,
      name: "Anita Patel",
      location: "Delhi",
      rating: 5,
      text: "The quality is amazing and the fit is perfect! So comfortable during pregnancy and after. The zipless design is revolutionary - I can't imagine going back to regular nursing wear.",
      image: "/placeholder.svg?height=80&width=80",
      verified: true,
    },
    {
      id: 3,
      name: "Kavya Reddy",
      location: "Bangalore",
      rating: 5,
      text: "Love the elegant designs! Finally found maternity wear that doesn't compromise on style. The fabric is so soft and breathable, perfect for our climate.",
      image: "/placeholder.svg?height=80&width=80",
      verified: true,
    },
    {
      id: 4,
      name: "Meera Singh",
      location: "Pune",
      rating: 5,
      text: "Excellent customer service and fast delivery. The clothes fit perfectly and are so comfortable. Shitha has made my motherhood journey so much easier!",
      image: "/placeholder.svg?height=80&width=80",
      verified: true,
    },
  ]

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-20 bg-gradient-to-br from-pink-50 via-pink-25 to-purple-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">
            Customer <span className="text-pink-500">Love</span>
          </h2>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Real stories from real moms who chose Shitha
          </p>
        </div>

        {/* Main Testimonial Card */}
        <div className="relative">
          <Card className="bg-white rounded-3xl shadow-2xl border-0 overflow-hidden transform transition-all duration-500 max-w-4xl mx-auto">
            <CardContent className="p-8 lg:p-12 xl:p-16 relative">
              {/* Large Quote Mark - Responsive sizing */}
              <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                <div className="text-6xl lg:text-7xl xl:text-8xl font-serif text-pink-200 leading-none select-none">
                  "
                </div>
              </div>

              {/* Profile Section */}
              <div className="flex flex-col items-center mb-6 lg:mb-8">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-100 mb-3 lg:mb-4 overflow-hidden">
                  <Image
                    src={currentTestimonial.image || "/placeholder.svg"}
                    alt={currentTestimonial.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-1">{currentTestimonial.name}</h3>
                <p className="text-gray-500 mb-4">{currentTestimonial.location}</p>

                {/* Rating and Verified Badge */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {currentTestimonial.verified && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      Verified Buyer
                    </span>
                  )}
                </div>
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-lg lg:text-xl xl:text-2xl text-gray-700 leading-relaxed text-center italic font-medium max-w-3xl mx-auto">
                "{currentTestimonial.text}"
              </blockquote>
            </CardContent>
          </Card>

          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="lg"
            onClick={prevTestimonial}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg border-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={nextTestimonial}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg border-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-300"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center mt-8 space-x-3">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-pink-500 scale-125" : "bg-pink-200 hover:bg-pink-300"
              }`}
            />
          ))}
        </div>

        {/* Stats Section */}
        <div className="text-center mt-16">
          <div className="text-6xl font-bold text-pink-500 mb-2">500+</div>
          <p className="text-gray-600 text-lg">Happy Mothers Trust Shitha</p>
        </div>
      </div>
    </section>
  )
}
