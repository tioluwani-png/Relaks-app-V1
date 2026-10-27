'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Horizontal scroll-snap row with a peek of the next card.
 * `desktopGridClassName` turns it into a normal grid from md up (e.g. "md:grid-cols-3").
 */
export function SwipeRow({
  children,
  label,
  dots = false,
  arrows = false,
  itemClassName,
  desktopGridClassName,
  className,
}: {
  children: ReactNode
  label: string
  dots?: boolean
  /** Previous/next buttons from md up, for mouse users */
  arrows?: boolean
  itemClassName?: string
  desktopGridClassName?: string
  className?: string
}) {
  const items = Children.toArray(children)
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!dots || !track) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index))
          }
        }
      },
      { root: track, threshold: 0.6 }
    )
    Array.from(track.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [dots, items.length])

  const scrollTo = (index: number) => {
    const target = trackRef.current?.children[index] as HTMLElement | undefined
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  const page = (direction: 1 | -1) => {
    const track = trackRef.current
    track?.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  const arrowClass =
    'absolute top-1/3 z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-50 md:flex'

  return (
    <div className={cn(arrows && 'relative', className)}>
      {arrows && (
        <>
          <button type="button" onClick={() => page(-1)} aria-label="Scroll left" className={cn(arrowClass, '-left-5')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => page(1)} aria-label="Scroll right" className={cn(arrowClass, '-right-5')}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          // Bleed to the screen edge on mobile so the next card peeks in
          '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-purple-500',
          desktopGridClassName && cn('md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0', desktopGridClassName)
        )}
      >
        {items.map((child, i) => (
          <div key={i} data-index={i} className={cn('shrink-0 snap-start', itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      {dots && items.length > 1 && (
        <div className={cn('mt-2 flex justify-center gap-2', desktopGridClassName && 'md:hidden')}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to card ${i + 1} of ${items.length}`}
              aria-current={i === active}
              className="p-1"
            >
              <span
                className={cn(
                  'block h-2 rounded-full transition-all',
                  i === active ? 'w-6 bg-purple-600' : 'w-2 bg-gray-300'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
