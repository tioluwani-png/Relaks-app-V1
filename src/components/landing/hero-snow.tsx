'use client'

import { useEffect, useRef } from 'react'

// ~20 soft dots with fixed positions/timings (deterministic so server and client markup match)
const FLAKES = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + (i % 3),
  duration: 22 + ((i * 7) % 14),
  delay: -((i * 5) % 30),
  drift: ((i % 5) - 2) * 12,
  opacity: 0.55 + (i % 4) * 0.1,
}))

/** Very gentle CSS snowfall for the hero. Paused while off-screen; hidden with reduced motion (globals.css). */
export function HeroSnow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.removeAttribute('data-paused')
      else el.setAttribute('data-paused', '')
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="hero-snow pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ['--snow-drift' as string]: `${f.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
