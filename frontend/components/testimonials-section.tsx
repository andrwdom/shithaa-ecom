"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Heart, Instagram } from "lucide-react"
import Image from "next/image"
import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

// Decorative Components
const WashiTape = ({ className = "", rotation = 0, color = "pink" }: { className?: string; rotation?: number; color?: "pink" | "purple" | "sage" | "cream" }) => {
  const colorClasses: Record<"pink" | "purple" | "sage" | "cream", string> = {
    pink: "from-pink-200/80 to-rose-200/80",
    purple: "from-purple-200/80 to-violet-200/80",
    sage: "from-green-200/80 to-emerald-200/80",
    cream: "from-yellow-100/80 to-amber-100/80",
  }

  return (
    <div
      className={`absolute w-16 h-5 bg-gradient-to-r ${colorClasses[color]} rounded-sm shadow-sm backdrop-blur-sm ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  )
}

const PaperClip = ({ className = "" }) => (
  <div className={`absolute ${className} z-10`}>
    <svg width="20" height="24" viewBox="0 0 20 24" className="drop-shadow-sm">
      <path
        d="M6 2C4.89543 2 4 2.89543 4 4V16C4 19.3137 6.68629 22 10 22C13.3137 22 16 19.3137 16 16V6C16 4.89543 15.1046 4 14 4C12.8954 4 12 4.89543 12 6V14"
        stroke="#9CA3AF"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  </div>
)

const FloatingHeart = ({ delay = 0 }) => (
  <motion.div
    className="absolute top-2 right-2 z-20"
    initial={{ scale: 0, opacity: 0 }}
    animate={{
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0.8],
      y: [0, -5, 0],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Number.POSITIVE_INFINITY,
      repeatDelay: 3,
      ease: "easeInOut",
    }}
  >
    <Heart className="w-4 h-4 text-pink-400 fill-pink-300" />
  </motion.div>
)

interface TestimonialCardProps {
  testimonial: { id: number; image: string }
  index: number
  isActive: boolean
}
const TestimonialCard = ({ testimonial, index, isActive }: TestimonialCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const rotations = [-2, 1, -1, 2, -3, 1.5]
  const rotation = rotations[index % rotations.length]

  const decorativeElements = [
    { type: "tape", color: "pink", rotation: -8, position: "top-1 left-3" },
    { type: "clip", position: "top-0 right-2" },
    { type: "tape", color: "sage", rotation: 12, position: "top-2 right-4" },
    { type: "tape", color: "purple", rotation: -15, position: "top-0 left-2" },
    { type: "clip", position: "top-1 right-1" },
    { type: "tape", color: "cream", rotation: 10, position: "top-2 left-4" },
  ] as const;

  const currentDecor = decorativeElements[index % decorativeElements.length]

  return (
    <motion.div
      className="flex-shrink-0 w-80 md:w-96 mx-6 relative"
      initial={{ opacity: 0, y: 50, rotateY: -15 }}
      animate={{
        opacity: isActive ? 1 : 0.7,
        y: 0,
        rotateY: 0,
        scale: isActive ? 1 : 0.95,
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ transform: `rotate(${rotation}deg)` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glassmorphic container */}
      <motion.div
        className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20"
        whileHover={{
          scale: 1.02,
          rotateZ: 0,
          transition: { duration: 0.3 },
        }}
      >
        {/* Decorative elements */}
        {currentDecor.type === "tape" && (
          <WashiTape className={currentDecor.position} rotation={currentDecor.rotation} color={currentDecor.color} />
        )}
        {currentDecor.type === "clip" && <PaperClip className={currentDecor.position} />}

        {/* Floating hearts on hover */}
        <AnimatePresence>
          {isHovered && (
            <>
              <FloatingHeart delay={0} />
              <FloatingHeart delay={0.5} />
            </>
          )}
        </AnimatePresence>

        {/* Instagram DM Screenshot */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <Image
            src={`/testimonials/testi${index + 1}.jpg`}
            alt={`Customer testimonial ${index + 1} - Instagram DM screenshot`}
            width={400}
            height={600}
            className="w-full h-[500px] object-cover"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAAcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />

          {/* Instagram-like overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

          {/* Instagram indicator */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <Instagram className="w-4 h-4 text-pink-500" />
          </div>
        </div>

        {/* Subtle shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-3xl"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 5,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </motion.div>
  )
}

const TestimonialsSection = () => {
  const [isPaused, setIsPaused] = useState(false)
  const [isSectionVisible, setIsSectionVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0) // <-- store offset between pauses
  const CARD_WIDTH = 400
  const GAP = 24 // px, for spacing between cards
  const SPEED = 60 // px per second, smooth and lively

  // Sample testimonial data
  const testimonials = [
    { id: 1, image: "testi1.jpg" },
    { id: 2, image: "testi2.jpg" },
    { id: 3, image: "testi3.jpg" },
    { id: 4, image: "testi4.jpg" },
    { id: 5, image: "testi5.jpg" },
    { id: 6, image: "testi6.jpg" },
    { id: 7, image: "testi7.jpg" },
    { id: 8, image: "testi8.jpg" },
  ]
  const totalWidth = testimonials.length * (CARD_WIDTH + GAP)

  // Intersection Observer: enable autoplay only when section is (almost) visible
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new window.IntersectionObserver(
      ([entry]) => setIsSectionVisible(entry.isIntersecting),
      { root: null, rootMargin: '0px 0px -200px 0px', threshold: 0.01 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Smooth, lag-free animation using ref and direct DOM manipulation
  useEffect(() => {
    if (!isSectionVisible || isPaused) return
    const container = containerRef.current
    if (!container) return
    let offset = offsetRef.current // <-- start from last offset
    let lastTime: number | null = null
    let frame: number
    function animate(ts: number) {
      if (!container) return // linter fix
      if (lastTime === null) lastTime = ts
      const delta = ts - lastTime
      lastTime = ts
      offset += (SPEED * delta) / 1000
      if (offset >= totalWidth) offset = 0
      container.style.transform = `translateX(-${offset}px)`
      offsetRef.current = offset // <-- update ref for pause/resume
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [isSectionVisible, isPaused, totalWidth])

  // Responsive: show 1 card on mobile, 2-3 on desktop
  // Use Tailwind classes for responsive width
  return (
    <section
      ref={sectionRef}
      className="py-24 px-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, 
          #FFFDF7 0%, 
          #FFE7EF 25%, 
          #F4F0FA 50%, 
          #DDE9D5 75%, 
          #FFE7EF 100% 
        )`,
      }}
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23473C66' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-40 h-40 bg-pink-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-32 right-16 w-56 h-56 bg-purple-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-32 h-32 bg-green-200/20 rounded-full blur-2xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <div className="relative inline-block">
            <WashiTape className="-top-3 -left-6" rotation={-12} color="pink" />
            <h2 className="text-5xl md:text-6xl font-serif text-[#473C66] mb-6 relative">Moms Who Chose Shithaa 💕</h2>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-pink-300/60 rounded-full"></div>
            <div className="absolute -top-4 right-12 w-3 h-3 bg-purple-300/60 rounded-full"></div>
          </div>
          <motion.p
            className="text-xl text-gray-600 font-light italic mt-6 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Here's what they shared with us on Instagram
          </motion.p>
        </motion.div>

        {/* Carousel Container */}
        <div
          className="relative mb-16"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Main Carousel - seamless loop */}
          <div className="overflow-hidden relative mx-auto w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
            <div
              ref={containerRef}
              className="flex"
              style={{ width: totalWidth * 2 }}
            >
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <TestimonialCard
                  key={testimonial.id + '-' + index}
                  testimonial={testimonial}
                  index={index % testimonials.length}
                  isActive={false}
                />
              ))}
            </div>
          </div>
          {/* Navigation Arrows and Dots can be removed or kept for manual jump if desired */}
        </div>

        {/* Dots Indicator */}
        <motion.div
          className="flex justify-center mb-12 space-x-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {testimonials.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                const container = containerRef.current;
                if (!container) return;
                const transform = container.style.transform;
                const currentOffset = -parseFloat(transform?.replace('translateX(', '').replace('px)', '') || '0');
                const targetOffset = index * (CARD_WIDTH + GAP);
                const distance = targetOffset - currentOffset;
                const duration = Math.abs(distance / SPEED) * 1000; // ms
                const startTime = performance.now();

                function step(currentTime: number) {
                  if (!container) return;
                  const elapsed = currentTime - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  const transform = container.style.transform;
                  const currentOffset = -parseFloat(transform?.replace('translateX(', '').replace('px)', '') || '0');
                  const targetOffset = index * (CARD_WIDTH + GAP);
                  const distance = targetOffset - currentOffset;
                  const newOffset = currentOffset + (distance * progress);
                  container.style.transform = `translateX(-${newOffset}px)`;

                  if (progress < 1) {
                    requestAnimationFrame(step);
                  }
                }
                requestAnimationFrame(step);
              }}
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                (() => {
                  const container = containerRef.current;
                  if (!container) return false;
                  const transform = container.style.transform;
                  const offset = parseFloat(transform?.replace('translateX(', '').replace('px)', '') || '0');
                  return index === Math.floor(offset / (CARD_WIDTH + GAP)) % testimonials.length;
                })()
                  ? "bg-[#473C66] scale-125 shadow-lg"
                  : "bg-gray-300/60 hover:bg-gray-400/80 hover:scale-110"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <a
            href="https://www.instagram.com/shithaa.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-gradient-to-r from-[#473C66] to-purple-500 hover:from-purple-600 hover:to-purple-700 text-white px-10 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-medium"
          >
            <Instagram className="w-5 h-5 mr-3" />
            View More Stories
          </a>
        </motion.div>
      </div>

      {/* Decorative Instagram watermark */}
      <div className="absolute bottom-8 right-8 opacity-10">
        <Instagram className="w-16 h-16 text-[#473C66]" />
      </div>
    </section>
  )
}

export default TestimonialsSection 