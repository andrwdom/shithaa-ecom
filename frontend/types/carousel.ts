export interface CarouselImage {
  id: string
  url: string
  alt?: string
  title?: string
  link?: string
  order?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CarouselResponse {
  success: boolean
  data?: CarouselImage[]
  carousels?: CarouselImage[]
  message?: string
  error?: string
}

export interface BannerCarouselProps {
  images?: CarouselImage[]
  autoPlay?: boolean
  interval?: number
  showArrows?: boolean
  showDots?: boolean
  className?: string
}

export interface UseCarouselReturn {
  images: CarouselImage[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} 