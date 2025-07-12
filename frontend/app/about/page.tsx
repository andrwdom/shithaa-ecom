"use client"
import { motion } from "framer-motion"
import { Heart, Instagram, Sparkles, Quote, Baby, Users, Smile } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

// Decorative Components
const WashiTape = ({ className = "", rotation = 0 }) => (
  <div
    className={`absolute w-16 h-6 bg-gradient-to-r from-pink-200 to-rose-200 opacity-60 rounded-sm shadow-sm ${className}`}
    style={{ transform: `rotate(${rotation}deg)` }}
  />
)

const PaperPin = ({ className = "" }) => (
  <div className={`absolute ${className}`}>
    <div className="w-3 h-3 bg-gradient-to-br from-amber-300 to-amber-400 rounded-full shadow-md border border-amber-500"></div>
    <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-[#473C66] rounded-full opacity-70"></div>
  </div>
)

// Baby-themed decorative elements
const BabyDoodle = ({ className = "" }) => (
  <div className={`absolute ${className}`}>
    <Baby className="w-6 h-6 text-pink-300 opacity-60" />
  </div>
)

const HeartDoodle = ({ className = "" }) => (
  <div className={`absolute ${className}`}>
    <Heart className="w-4 h-4 text-rose-300 opacity-50 fill-current" />
  </div>
)

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-lavender-50">
      {/* Subtle background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-16 w-32 h-32 bg-[#473C66] rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute top-96 right-20 w-40 h-40 bg-pink-300 rounded-full opacity-8 blur-3xl"></div>
        <div className="absolute bottom-32 left-1/3 w-36 h-36 bg-purple-300 rounded-full opacity-6 blur-3xl"></div>
        {/* Baby-themed background elements */}
        <div className="absolute top-1/4 right-1/4 w-20 h-20 bg-rose-200 rounded-full opacity-10 blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-pink-200 rounded-full opacity-12 blur-2xl"></div>
      </div>

      <div className="relative z-10">
        {/* Brand Story Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-purple-50 to-pink-50">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto"
          >
            {/* Section Header */}
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <div className="relative inline-block">
                <WashiTape className="-top-2 -right-4" rotation={12} />
                <BabyDoodle className="-top-4 left-4" />
                <h2 className="text-3xl md:text-5xl font-light text-[#473C66] relative">
                  Our <span className="font-semibold">Story</span>
                </h2>
                <PaperPin className="top-2 left-0" />
                <HeartDoodle className="bottom-2 right-4" />
              </div>
            </motion.div>

            {/* Story Content */}
            <motion.div variants={fadeInUp} className="grid md:grid-cols-3 gap-8 items-start">
              {/* Founder Image */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-3 shadow-lg transform rotate-2">
                  <Image
                    src="/placeholder.svg?height=300&width=250"
                    alt="Founder of Shinthaa with her child, representing the mother-child bond"
                    width={250}
                    height={300}
                    className="w-full h-72 object-cover rounded-xl"
                  />
        </div>
                <PaperPin className="top-2 right-2" />
                <BabyDoodle className="bottom-4 left-4" />

                {/* Instagram Badge */}
                <div className="absolute -bottom-4 -right-4 bg-white rounded-full p-3 shadow-lg border border-pink-100">
                  <div className="flex items-center space-x-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <span className="text-sm font-semibold text-gray-700">27k</span>
                  </div>
                </div>
        </div>

              {/* Story Text */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-100 to-transparent rounded-bl-full"></div>
                  <HeartDoodle className="top-4 left-4" />
                  <BabyDoodle className="bottom-4 right-4" />

                  <h3 className="text-2xl font-semibold text-[#473C66] mb-4">Founded with Love & Understanding</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Shinthaa was born from the heart of a passionate creator, mother, and influencer who, through her
                    journey with her growing community of 27,000 followers, witnessed the beautiful yet challenging
                    experience of expecting mothers preparing to welcome their little ones.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    What started as heartfelt conversations about the excitement, anticipation, and dreams of motherhood
                    evolved into a mission: to create maternity wear that honors not just your changing body, but the
                    incredible love story unfolding between you and your baby.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Every piece in our collection is thoughtfully designed with both mother and child in
                    mind—comfortable for your growing bump, beautiful for your glowing spirit, and perfect for those
                    first precious moments when you finally meet your little miracle.
                  </p>
                </div>
          </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Growing Together Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-rose-50 to-purple-50">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <div className="relative inline-block">
                <WashiTape className="-top-2 -right-4" rotation={8} />
                <h2 className="text-3xl md:text-4xl font-light text-[#473C66] relative">
                  Growing <span className="font-semibold">Together</span>
                </h2>
                <BabyDoodle className="top-0 -left-8" />
                <HeartDoodle className="bottom-0 right-0" />
        </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Heart,
                  title: "First Connection",
                  description:
                    "From the first flutter to the first kick, we celebrate every precious moment of your growing bond",
                  color: "from-rose-400 to-pink-500",
                },
                {
                  icon: Users,
                  title: "Preparing Together",
                  description:
                    "Beautiful maternity wear that honors both your journey and the little life you're nurturing",
                  color: "from-[#473C66] to-purple-500",
                },
                {
                  icon: Smile,
                  title: "Welcoming Joy",
                  description:
                    "Comfortable, elegant pieces that transition beautifully from pregnancy to those first precious moments",
                  color: "from-amber-400 to-orange-400",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 shadow-lg relative overflow-hidden transform hover:scale-105 transition-transform duration-300"
                >
                  {/* Decorative elements */}
                  <HeartDoodle className="top-2 right-2" />
                  <BabyDoodle className="bottom-2 left-2" />

                  <div className="text-center">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                    >
                      <item.icon className="w-8 h-8 text-white" />
              </div>
                    <h3 className="text-xl font-semibold text-[#473C66] mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
            </div>
                </motion.div>
          ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Mission Quote Section */}
        <section className="py-20 px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="relative">
              {/* Quote Block */}
              <div className="bg-gradient-to-br from-[#FDE8E8] to-[#E6E1F4] rounded-3xl p-12 md:p-16 shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-6 left-6 w-8 h-8 bg-white rounded-full opacity-40"></div>
                <div className="absolute top-6 right-6 w-6 h-6 bg-[#473C66] rounded-full opacity-20"></div>
                <div className="absolute bottom-6 left-8 w-4 h-4 bg-pink-300 rounded-full opacity-50"></div>
                <div className="absolute bottom-6 right-8 w-10 h-10 bg-purple-200 rounded-full opacity-30"></div>
                <BabyDoodle className="top-8 left-1/4" />
                <HeartDoodle className="bottom-8 right-1/4" />
                <BabyDoodle className="top-1/3 right-8" />

                <Quote className="w-12 h-12 text-[#473C66] mx-auto mb-8 opacity-60" />

                <blockquote className="text-2xl md:text-4xl font-light italic text-[#473C66] leading-relaxed mb-8">
                  "Because motherhood deserves more than just comfort — it deserves elegance, confidence, and the
                  celebration of the beautiful bond growing between you and your little one."
                </blockquote>

                <div className="flex justify-center items-center space-x-3">
                  <Heart className="w-6 h-6 text-pink-400" />
                  <span className="text-lg font-medium text-gray-600">The Shinthaa Promise</span>
                  <Baby className="w-6 h-6 text-[#473C66]" />
                </div>
        </div>

              {/* Decorative pins */}
              <PaperPin className="top-4 left-4" />
              <PaperPin className="bottom-4 right-4" />
          </div>
          </motion.div>
        </section>

        {/* Values Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-lavender-50 to-purple-50">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <div className="relative inline-block">
                <WashiTape className="-top-2 -right-4" rotation={-5} />
                <h2 className="text-3xl md:text-4xl font-light text-[#473C66] relative">
                  Our <span className="font-semibold">Values</span>
                </h2>
                <BabyDoodle className="top-0 -right-8" />
                <HeartDoodle className="bottom-0 left-0" />
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Heart,
                  title: "Love",
                  description: "Every design is created with love and understanding for the mother-child journey",
                  color: "from-pink-400 to-rose-500",
                },
                {
                  icon: Sparkles,
                  title: "Elegance",
                  description: "Beautiful designs that make you feel confident and radiant during pregnancy",
                  color: "from-purple-400 to-indigo-500",
                },
                {
                  icon: Baby,
                  title: "Comfort",
                  description: "Premium fabrics and thoughtful design for ultimate comfort and ease",
                  color: "from-blue-400 to-cyan-500",
                },
                {
                  icon: Users,
                  title: "Community",
                  description: "Building a supportive community of mothers sharing their beautiful journeys",
                  color: "from-green-400 to-emerald-500",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 shadow-lg relative overflow-hidden transform hover:scale-105 transition-transform duration-300"
                >
                  <HeartDoodle className="top-2 right-2" />
                  <BabyDoodle className="bottom-2 left-2" />

                  <div className="text-center">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                    >
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#473C66] mb-3">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="bg-gradient-to-br from-[#473C66] to-purple-600 rounded-3xl p-12 md:p-16 text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-6 left-6 w-8 h-8 bg-white rounded-full opacity-20"></div>
              <div className="absolute top-6 right-6 w-6 h-6 bg-pink-300 rounded-full opacity-30"></div>
              <div className="absolute bottom-6 left-8 w-4 h-4 bg-purple-200 rounded-full opacity-40"></div>
              <div className="absolute bottom-6 right-8 w-10 h-10 bg-rose-200 rounded-full opacity-25"></div>
              <BabyDoodle className="top-8 left-1/4" />
              <HeartDoodle className="bottom-8 right-1/4" />

              <h2 className="text-3xl md:text-4xl font-light mb-6">
                Join the <span className="font-semibold">Shinthaa</span> Family
              </h2>
              <p className="text-lg mb-8 opacity-90 leading-relaxed">
                Discover our collection of elegant maternity wear and feeding essentials designed with love for you and your little one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-[#473C66] hover:bg-gray-100 rounded-full px-8 py-3 font-semibold"
                  onClick={() => window.location.href = '/collections/maternity-feeding-wear'}
                >
                  Shop Collection
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#473C66] rounded-full px-8 py-3 font-semibold"
                  onClick={() => window.location.href = '/contact'}
                >
                  Get in Touch
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
} 