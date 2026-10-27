import Image from 'next/image'
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
    <div className={cn('relative overflow-hidden bg-purple-50', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
    </div>
  )
}

/**
 * Phone mock-up. Shows `src` as the screen, or a soft brand gradient with the
 * feature name until a real screenshot is added.
 */
export function PhoneFrame({
  src,
  alt,
  label,
  sizes = '(min-width: 768px) 280px, 60vw',
  className,
}: {
  src: string | null
  alt: string
  label: string
  sizes?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative mx-auto aspect-[9/19] w-full max-w-[280px] rounded-[2.5rem] bg-gray-900 p-2.5 shadow-2xl shadow-purple-200/60',
        className
      )}
    >
      {/* Speaker notch */}
      <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-700" aria-hidden="true" />
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#FFFBF5]">
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <div
            role="img"
            aria-label={alt}
            className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-purple-200 via-pink-100 to-orange-100 p-6 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-white/70 shadow-sm" aria-hidden="true" />
            <p className="text-lg font-bold text-gray-900">{label}</p>
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
