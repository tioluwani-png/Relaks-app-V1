import type { ReactNode } from 'react'
import Image from 'next/image'
import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LandingImage } from '@/lib/landing/images'

/** Fixed-aspect photo box. Lazy by default; pass `preload` only for the hero. */
export function LandingPhoto({
  src,
  alt,
  sizes,
  preload = false,
  className,
}: {
  src: string
  alt: string
  sizes: string
  preload?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden bg-relaks-tint', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
    </div>
  )
}

/**
 * Phone mock-up. Shows `src` as the screen, else `children` (a built screen),
 * else a warm tint with the feature name.
 */
export function PhoneFrame({
  src,
  alt,
  label,
  sizes = '(min-width: 768px) 280px, 60vw',
  className,
  children,
}: {
  src: string | null
  alt: string
  label: string
  sizes?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'relative mx-auto aspect-[9/19] w-full max-w-[280px] rounded-[15%/7.1%] bg-relaks-ink shadow-xl shadow-relaks-ink/15',
        className
      )}
    >
      {/* Speaker notch */}
      <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/25" aria-hidden="true" />
      {/* Absolutely placed so the screen always fits the frame, whatever it contains */}
      <div className="absolute inset-x-[6%] inset-y-[2.85%] overflow-hidden rounded-[11%/5.4%] bg-relaks-cream">
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : children ? (
          <div role="img" aria-label={alt} className="h-full w-full">
            {children}
          </div>
        ) : (
          <div
            role="img"
            aria-label={alt}
            className="flex h-full w-full flex-col items-center justify-center gap-4 bg-relaks-tint p-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-relaks-orange/15" aria-hidden="true">
              <Smartphone className="h-7 w-7 text-relaks-orange" />
            </div>
            <p className="text-sm md:text-lg font-bold text-relaks-ink">{label}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders any landing image slot: photo in a fixed-aspect box, or a phone frame. */
export function LandingImageView({
  image,
  sizes,
  preload,
  photoClassName,
  phoneClassName,
}: {
  image: LandingImage
  sizes: string
  preload?: boolean
  photoClassName?: string
  phoneClassName?: string
}) {
  if (image.kind === 'phone') {
    return <PhoneFrame src={image.src} alt={image.alt} label={image.label} className={phoneClassName} />
  }
  return <LandingPhoto src={image.src} alt={image.alt} sizes={sizes} preload={preload} className={photoClassName} />
}
