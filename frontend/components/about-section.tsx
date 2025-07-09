"use client"

import Image from "next/image"

export default function AboutSection() {
  return (
    <section id="about" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 font-serif">About Shitha</h2>
              <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
                <p>
                  At Shitha, we believe that motherhood should be joyful, not stressful. Our mission is to make
                  maternity wear both elegant and functional so that every mom feels confident and comfortable.
                </p>
                <p>
                  Founded by mothers, for mothers, we understand the unique challenges and beautiful moments of this
                  incredible journey. Every piece in our collection is thoughtfully designed with premium fabrics and
                  innovative features that adapt to your changing body.
                </p>
                <p>
                  From our revolutionary zipless feeding wear to our ultra-soft lounge collections, we're here to
                  support you through every stage of motherhood with style, comfort, and grace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400 mb-2">10,000+</div>
                <div className="text-sm text-gray-600">Happy Mothers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50+</div>
                <div className="text-sm text-gray-600">Unique Designs</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/placeholder.svg?height=500&width=400"
                alt="About Shitha - Mother and baby"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-100/20 to-transparent" />
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-pink-200/30 rounded-full blur-xl" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-200/30 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
