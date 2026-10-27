'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Share2 } from 'lucide-react'
import { HERO_COLORING, type Swatch } from '@/lib/landing/content'
import { SwatchRow } from './swatch-row'
import { TrackedLink, trackLandingEvent } from './tracked-link'

export interface HeroColoringProps {
  /** id of the card that holds the server-rendered SVG */
  cardId: string
  /** id of the empty element under the card where messages appear */
  messagesId: string
  palette: Swatch[]
  completeHeading: string
  shopHref: string
  shopLabel: string
  onReady?: () => void
}

interface Fill {
  el: SVGPathElement
  prev: string
}

// Taps that land on ink or between shapes snap to the nearest region within ~12px
const SNAP_RADII = [4, 8, 12]
const SNAP_ANGLES = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6)

function isRegion(el: Element | null): el is SVGPathElement {
  return !!el && el.classList.contains('region')
}

function isFilled(el: SVGPathElement) {
  const fill = el.style.fill
  return fill !== '' && fill !== 'white' && fill !== 'rgb(255, 255, 255)' && fill !== '#ffffff'
}

export function HeroColoring({ cardId, messagesId, palette, completeHeading, shopHref, shopLabel, onReady }: HeroColoringProps) {
  const [selected, setSelected] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [userFills, setUserFills] = useState(0)
  const [complete, setComplete] = useState(false)
  const [sharing, setSharing] = useState(false)
  // The island only renders in the browser (dynamic, ssr: false), so document is available here
  const [messagesEl] = useState<HTMLElement | null>(() => document.getElementById(messagesId))

  const svgRef = useRef<SVGSVGElement | null>(null)
  const regionsRef = useRef<SVGPathElement[]>([])
  const initialRef = useRef<Map<SVGPathElement, string>>(new Map())
  const historyRef = useRef<Fill[]>([])
  const selectedRef = useRef(0)
  const pointerTypeRef = useRef('mouse')
  const userFillsRef = useRef(0)
  const trackedRef = useRef({ first: false, three: false, complete: false })

  // Update the ref straight away so a tap right after choosing a swatch uses the new colour
  const select = useCallback((index: number) => {
    selectedRef.current = index
    setSelected(index)
  }, [])

  const recount = useCallback(() => {
    const regions = regionsRef.current
    const filled = regions.filter(isFilled).length
    const isComplete = regions.length > 0 && filled >= Math.ceil(regions.length * HERO_COLORING.completeRatio)
    setComplete(isComplete)
    if (isComplete && !trackedRef.current.complete) {
      trackedRef.current.complete = true
      trackLandingEvent('hero_color_complete')
    }
    setCanUndo(historyRef.current.length > 0)
  }, [])

  const fill = useCallback(
    (el: SVGPathElement) => {
      const hex = palette[selectedRef.current].hex
      const prev = el.style.fill
      if (prev.toLowerCase() === hex.toLowerCase()) return
      historyRef.current.push({ el, prev })
      el.style.fill = hex

      // Lets the floating pencils react without the two components knowing about each other
      const box = el.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent('relaks:fill', { detail: { color: hex, x: box.left + box.width / 2, y: box.top + box.height / 2 } })
      )

      try {
        navigator.vibrate?.(10)
      } catch {
        // Not supported (iOS) or blocked - silent
      }

      const count = ++userFillsRef.current
      if (count === 1 && !trackedRef.current.first) {
        trackedRef.current.first = true
        trackLandingEvent('hero_color_first_fill')
      }
      if (count === 3 && !trackedRef.current.three) {
        trackedRef.current.three = true
        trackLandingEvent('hero_color_three_fills')
      }
      setUserFills(count)
      recount()
    },
    [palette, recount]
  )

  // Attach to the server-rendered SVG before first paint, then swap out the placeholder controls
  useLayoutEffect(() => {
    const svg = document.querySelector<SVGSVGElement>(`#${cardId} svg`)
    if (!svg) return
    svgRef.current = svg

    const regions = Array.from(svg.querySelectorAll<SVGPathElement>('.region'))
    regionsRef.current = regions
    initialRef.current = new Map(regions.map((el) => [el, el.style.fill]))

    // Roving focus: one tab stop, arrow keys move between areas
    regions.forEach((el, i) => {
      el.setAttribute('tabindex', i === 0 ? '0' : '-1')
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', `Area ${i + 1} of ${regions.length}`)
    })
    svg.setAttribute('aria-describedby', `${cardId}-help`)

    onReady?.()
  }, [cardId, onReady])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const regions = regionsRef.current
    let pressed: SVGPathElement | null = null

    const release = () => {
      pressed?.removeAttribute('data-pressed')
      pressed = null
    }

    const onPointerDown = (e: PointerEvent) => {
      pointerTypeRef.current = e.pointerType
      const target = e.target as Element
      if (isRegion(target)) {
        pressed = target
        target.setAttribute('data-pressed', '')
      }
    }

    const nearestRegion = (x: number, y: number): SVGPathElement | null => {
      for (const r of SNAP_RADII) {
        for (const a of SNAP_ANGLES) {
          const el = document.elementFromPoint(x + r * Math.cos(a), y + r * Math.sin(a))
          if (isRegion(el) && svg.contains(el)) return el
        }
      }
      return null
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element
      let region: SVGPathElement | null = isRegion(target) ? target : null
      if (!region && pointerTypeRef.current !== 'mouse') {
        region = nearestRegion(e.clientX, e.clientY)
      }
      if (region) fill(region)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element
      if (!isRegion(target)) return
      const index = regions.indexOf(target)
      let next = -1
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          fill(target)
          return
        case 'ArrowRight':
        case 'ArrowDown':
          next = Math.min(index + 1, regions.length - 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          next = Math.max(index - 1, 0)
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = regions.length - 1
          break
        default:
          return
      }
      e.preventDefault()
      target.setAttribute('tabindex', '-1')
      regions[next].setAttribute('tabindex', '0')
      regions[next].focus()
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointerup', release)
    svg.addEventListener('pointercancel', release)
    svg.addEventListener('pointerleave', release)
    svg.addEventListener('click', onClick)
    svg.addEventListener('keydown', onKeyDown)
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointerup', release)
      svg.removeEventListener('pointercancel', release)
      svg.removeEventListener('pointerleave', release)
      svg.removeEventListener('click', onClick)
      svg.removeEventListener('keydown', onKeyDown)
    }
  }, [fill])

  const undo = () => {
    const last = historyRef.current.pop()
    if (last) last.el.style.fill = last.prev
    recount()
  }

  const reset = () => {
    for (const [el, initial] of initialRef.current) el.style.fill = initial
    historyRef.current = []
    recount()
  }

  const share = async () => {
    const svg = svgRef.current
    if (!svg || sharing) return
    setSharing(true)
    trackLandingEvent(HERO_COLORING.share.event)
    try {
      const { shareColoring } = await import('./hero-coloring-export')
      await shareColoring(svg, { footer: HERO_COLORING.share.footer, fileName: HERO_COLORING.share.fileName })
    } finally {
      setSharing(false)
    }
  }

  const messageClass =
    'animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out motion-reduce:animate-none rounded-2xl border border-relaks-ink/10 bg-white/90 p-4 text-center'

  const messages = (
    <div className="space-y-3" aria-live="polite">
      {complete ? (
        <div className={messageClass}>
          <p className="font-semibold text-relaks-ink">{completeHeading}</p>
          <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={share}
              disabled={sharing}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-relaks-ink px-5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {sharing ? 'Preparing…' : HERO_COLORING.share.label}
            </button>
            <TrackedLink
              href={shopHref}
              event={HERO_COLORING.shopCta.event}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border-2 border-relaks-ink/25 bg-white px-5 text-sm font-semibold text-relaks-ink hover:border-relaks-ink/60"
            >
              {shopLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
          </div>
        </div>
      ) : userFills >= 3 ? (
        <div className={messageClass}>
          <p className="text-relaks-ink">{HERO_COLORING.nudge}</p>
          <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <TrackedLink
              href={shopHref}
              event={HERO_COLORING.shopCta.event}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-relaks-ink px-5 text-sm font-semibold text-white hover:bg-black"
            >
              {shopLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
            <TrackedLink
              href={HERO_COLORING.nudgeCta.href}
              event={HERO_COLORING.nudgeCta.event}
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-relaks-ink/25 bg-white px-5 text-sm font-semibold text-relaks-ink hover:border-relaks-ink/60"
            >
              {HERO_COLORING.nudgeCta.label}
            </TrackedLink>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      <SwatchRow
        palette={palette}
        selected={selected}
        onSelect={select}
        onUndo={undo}
        onReset={reset}
        canUndo={canUndo}
        canReset={canUndo || userFills > 0}
      />
      {messagesEl && createPortal(messages, messagesEl)}
    </>
  )
}

export default HeroColoring
