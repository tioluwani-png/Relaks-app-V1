'use client'

import { useEffect, useRef } from 'react'
import { trackLandingEvent } from './tracked-link'

/**
 * Floating coloured pencils behind a section (ported from the "pencils" mode of
 * design-reference/hero-pencils-prototype.html: same drawing, physics and timings).
 * Home positions avoid every [data-pencils-avoid] element in the container (+16px).
 */

interface Pencil {
  hx: number
  hy: number
  ha: number
  x: number
  y: number
  a: number
  vx: number
  vy: number
  va: number
  c: string
  len: number
  ph: number
  nudgedAt: number
  placed: boolean
  body?: HTMLCanvasElement
  shadow?: HTMLCanvasElement
}

interface Box {
  l: number
  t: number
  r: number
  b: number
}

const W_PENCIL = 9
const PAD = 16
const SPRITE_PAD = 14
const TAP_RADIUS = 230
const TAP_FORCE = 720
const HOVER_RADIUS = 90
const IGNORE_TAPS = 'a, button, input, textarea, select, summary, [role="button"], [data-pencils-avoid]'

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** Pencil body as in the prototype, centred on (0, 0). */
function pencilPath(ctx: CanvasRenderingContext2D, L: number, c: string, withDetail: boolean) {
  const w = W_PENCIL
  ctx.fillStyle = c
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(-L / 2, -w / 2, L * 0.78, w, 3)
  else ctx.rect(-L / 2, -w / 2, L * 0.78, w)
  ctx.fill()
  if (!withDetail) return
  ctx.fillStyle = 'rgba(255,255,255,.28)'
  ctx.fillRect(-L / 2 + 3, -w / 2 + 1.5, L * 0.78 - 6, 2)
  ctx.fillStyle = '#F2D6B3'
  ctx.beginPath()
  ctx.moveTo(-L / 2 + L * 0.78, -w / 2)
  ctx.lineTo(L / 2, 0)
  ctx.lineTo(-L / 2 + L * 0.78, w / 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = c
  ctx.beginPath()
  ctx.moveTo(L / 2 - 6, -1.6)
  ctx.lineTo(L / 2, 0)
  ctx.lineTo(L / 2 - 6, 1.6)
  ctx.closePath()
  ctx.fill()
}

/**
 * Pre-render each pencil (and its body's soft shadow) once, so frames are just two drawImage calls.
 * Shadow values are in device pixels, as canvas shadows are in the prototype.
 */
function makeSprites(p: Pencil, dpr: number) {
  const sw = p.len + SPRITE_PAD * 2
  const sh = W_PENCIL + SPRITE_PAD * 2
  const make = () => {
    const cv = document.createElement('canvas')
    cv.width = Math.ceil(sw * dpr)
    cv.height = Math.ceil(sh * dpr)
    return cv
  }
  const body = make()
  const bctx = body.getContext('2d')!
  bctx.setTransform(dpr, 0, 0, dpr, (sw / 2) * dpr, (sh / 2) * dpr)
  pencilPath(bctx, p.len, p.c, true)

  // Shadow only: draw the body far off-canvas and offset its shadow back in
  const shadow = make()
  const sctx = shadow.getContext('2d')!
  const far = 10000
  sctx.setTransform(dpr, 0, 0, dpr, (sw / 2) * dpr - far, (sh / 2) * dpr)
  sctx.shadowColor = 'rgba(30,30,44,.18)'
  sctx.shadowBlur = 8
  sctx.shadowOffsetX = far
  pencilPath(sctx, p.len, '#000', false)

  p.body = body
  p.shadow = shadow
}

/** Is a pencil at (x, y, angle) clear of every box, including its sway, bob and thickness? */
function fits(x: number, y: number, ha: number, len: number, W: number, H: number, boxes: Box[]) {
  const mx = 6 + W_PENCIL / 2 + 2
  const my = 8 + W_PENCIL / 2 + 2
  for (const a of [ha - 0.3, ha, ha + 0.3]) {
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    for (const t of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const px = x + cos * len * t
      const py = y + sin * len * t
      if (px < mx || px > W - mx || py < my || py > H - my) return false
      for (const b of boxes) {
        if (px > b.l - PAD - mx && px < b.r + PAD + mx && py > b.t - PAD - my && py < b.b + PAD + my) return false
      }
    }
  }
  return true
}

function placeHomes(list: Pencil[], W: number, H: number, boxes: Box[]) {
  // Keep homes that are still clear, so re-measuring doesn't reshuffle the pencils
  const placed = list.filter((p) => p.placed && fits(p.hx, p.hy, p.ha, p.len, W, H, boxes))
  for (const p of list) {
    if (placed.includes(p)) continue
    let ok = false
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
      // Half the tries are near-horizontal, which fit the thin bands on phones
      const ha = attempt % 2 === 0 ? (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.35, 0.35) : rand(0, Math.PI * 2)
      const hx = rand(0, W)
      const hy = rand(0, H)
      if (!fits(hx, hy, ha, p.len, W, H, boxes)) continue
      // Keep them apart, relaxing the spacing if the space is tight
      const spacing = attempt < 200 ? 0.75 : 0.35
      if (placed.some((q) => Math.hypot(q.hx - hx, q.hy - hy) < ((q.len + p.len) / 2) * spacing)) continue
      p.hx = hx
      p.hy = hy
      p.ha = ha
      ok = true
    }
    p.placed = ok
    if (ok) placed.push(p)
  }
  return list.filter((p) => p.placed)
}

export interface FloatingPencilsProps {
  /** id of the section the canvas sits in */
  containerId: string
  count: number
  /** Count from 1024px wide, when different */
  desktopCount?: number
  palette: string[]
  /** Gentle nudge as the mouse passes */
  hover?: boolean
  /** React to `relaks:fill` events from the coloring hero */
  listenFills?: boolean
  /** Analytics event for the first background tap in a session */
  tapEvent?: string
}

export function FloatingPencils({ containerId, count, desktopCount, palette, hover = false, listenFills = false, tapEvent }: FloatingPencilsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = document.getElementById(containerId)
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!container || !cv || !ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let dpr = 1
    let all: Pencil[] = []
    let list: Pencil[] = []
    let visible = false
    let raf = 0
    let last = 0

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      for (const p of list) {
        if (!p.body || !p.shadow) continue
        const sw = p.len + SPRITE_PAD * 2
        const sh = W_PENCIL + SPRITE_PAD * 2
        // Shadow falls 4 device px down in screen space, whatever the pencil's angle
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr + 4)
        ctx.rotate(p.a)
        ctx.drawImage(p.shadow, -sw / 2, -sh / 2, sw, sh)
        ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr)
        ctx.rotate(p.a)
        ctx.drawImage(p.body, -sw / 2, -sh / 2, sw, sh)
      }
    }

    const step = (dt: number) => {
      const t = performance.now() / 1000
      for (const p of list) {
        const bobX = Math.sin(t * 0.5 + p.ph) * 6
        const bobY = Math.cos(t * 0.4 + p.ph) * 8
        p.vx += (p.hx + bobX - p.x) * 6 * dt
        p.vy += (p.hy + bobY - p.y) * 6 * dt
        p.va += (p.ha + Math.sin(t * 0.3 + p.ph) * 0.25 - p.a) * 4 * dt
        const damp = Math.pow(0.08, dt)
        p.vx *= damp
        p.vy *= damp
        p.va *= Math.pow(0.2, dt)
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.a += p.va * dt
      }
      draw()
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20)
      last = now
      step(dt)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (reduce || raf || !visible || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const layout = () => {
      const rect = container.getBoundingClientRect()
      W = rect.width
      H = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)

      const n = desktopCount && window.innerWidth >= 1024 ? desktopCount : count
      if (all.length !== n) {
        all = Array.from({ length: n }, (_, i) => ({
          hx: 0, hy: 0, ha: 0, x: 0, y: 0, a: 0, vx: 0, vy: 0, va: 0,
          c: palette[i % palette.length],
          len: rand(56, 84),
          ph: rand(0, 6.28),
          nudgedAt: 0,
          placed: false,
        }))
      }
      const boxes = Array.from(container.querySelectorAll('[data-pencils-avoid]')).map((el) => {
        const r = el.getBoundingClientRect()
        return { l: r.left - rect.left, t: r.top - rect.top, r: r.right - rect.left, b: r.bottom - rect.top }
      })
      const fresh = list.length === 0
      list = placeHomes(all, W, H, boxes)
      // How many found a clear home (the rest are skipped rather than drawn over text)
      cv.dataset.pencils = `${list.length}/${all.length}`
      for (const p of list) {
        // New pencils start at home; existing ones glide to their new home
        if (fresh || (p.x === 0 && p.y === 0)) {
          p.x = p.hx
          p.y = p.hy
          p.a = p.ha
        }
        makeSprites(p, dpr)
      }
      draw()
    }

    const local = (e: { clientX: number; clientY: number }) => {
      const r = container.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const push = (x: number, y: number, radius: number, force: number, spin: number) => {
      for (const p of list) {
        const dx = p.x - x
        const dy = p.y - y
        const d = Math.max(Math.hypot(dx, dy), 24)
        if (d > radius) continue
        const f = (1 - d / radius) * force
        p.vx += (dx / d) * f
        p.vy += (dy / d) * f
        p.va += rand(-1, 1) * spin * (1 - d / radius)
      }
    }

    let tracked = false
    // A completed tap (click), so a scroll that starts on the hero doesn't scatter the pencils
    const onTap = (e: MouseEvent) => {
      if ((e.target as Element).closest(IGNORE_TAPS)) return
      const { x, y } = local(e)
      push(x, y, TAP_RADIUS, TAP_FORCE, 9)
      start()
      if (tapEvent && !tracked) {
        tracked = true
        try {
          if (sessionStorage.getItem(tapEvent)) return
          sessionStorage.setItem(tapEvent, '1')
        } catch {
          // Storage unavailable - still count it once for this page view
        }
        trackLandingEvent(tapEvent)
      }
    }

    // About 10% of a tap, at most once every 250ms per pencil
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const { x, y } = local(e)
      const now = performance.now()
      for (const p of list) {
        const dx = p.x - x
        const dy = p.y - y
        const d = Math.max(Math.hypot(dx, dy), 24)
        if (d > HOVER_RADIUS || now - p.nudgedAt < 250) continue
        p.nudgedAt = now
        const f = (1 - d / HOVER_RADIUS) * TAP_FORCE * 0.1
        p.vx += (dx / d) * f
        p.vy += (dy / d) * f
        p.va += rand(-1, 1) * 0.9
      }
    }

    // A fill in the coloring card makes the nearest pencil of the closest colour hop
    const onFill = (e: Event) => {
      const { color, x, y } = (e as CustomEvent<{ color: string; x: number; y: number }>).detail ?? {}
      if (!color || list.length === 0) return
      const [r, g, b] = rgb(color)
      const dist = (c: string) => {
        const [r2, g2, b2] = rgb(c)
        return (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2
      }
      const best = Math.min(...list.map((p) => dist(p.c)))
      const at = local({ clientX: x, clientY: y })
      const target = list
        .filter((p) => dist(p.c) === best)
        .sort((p, q) => Math.hypot(p.x - at.x, p.y - at.y) - Math.hypot(q.x - at.x, q.y - at.y))[0]
      if (!target) return
      target.vy -= TAP_FORCE / 4
      target.va += rand(-1, 1) * 9 / 4
      start()
    }

    const watched = [container, ...Array.from(container.querySelectorAll('[data-pencils-avoid]'))]
    let resizeTimer = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(layout, 120)
    })
    watched.forEach((el) => ro.observe(el))
    document.fonts?.ready.then(layout).catch(() => {})

    layout()
    if (reduce) {
      // Drawn once at home; no animation, taps or hover
      return () => {
        ro.disconnect()
        window.clearTimeout(resizeTimer)
      }
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(container)

    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    container.addEventListener('click', onTap)
    if (hover) container.addEventListener('pointermove', onPointerMove)
    if (listenFills) window.addEventListener('relaks:fill', onFill)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      window.clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      container.removeEventListener('click', onTap)
      container.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('relaks:fill', onFill)
    }
  }, [containerId, count, desktopCount, palette, hover, listenFills, tapEvent])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}

export default FloatingPencils
