import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// These files are traced into the serverless bundle (outputFileTracingIncludes in next.config.ts),
// so they can still be read when Vercel re-renders the page.
const DIR = join(process.cwd(), 'public', 'landing')
const CHRISTMAS_FILE = 'hero-page.svg'
const DEFAULT_FILE = 'hero-page-default.svg'

const cache = new Map<string, string | null>()

function readSvg(file: string): string | null {
  if (cache.has(file)) return cache.get(file)!
  const path = join(DIR, file)
  const svg = existsSync(path) ? readFileSync(path, 'utf8') : null
  cache.set(file, svg)
  return svg
}

/**
 * The coloring page as inline SVG markup, unchanged except for:
 * - the C2PA <metadata> block and its namespace (not artwork; ~8KB)
 * - sizing so it scales to the card, and a group role instead of img
 * - `style="fill:…"` on the pre-filled regions
 * Out of season, hero-page-default.svg is used when present.
 */
export function getHeroArt(season: 'christmas' | 'default', prefill: Record<string, string>): string | null {
  const svg =
    season === 'default'
      ? readSvg(DEFAULT_FILE) ?? readSvg(CHRISTMAS_FILE)
      : readSvg(CHRISTMAS_FILE)
  if (!svg) return null

  let out = svg
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/, '')
    .replace(/<svg\b/, '<svg width="100%" height="100%" focusable="false" class="hero-coloring-svg"')
    .replace(/\srole="img"/, ' role="group"')

  for (const [id, hex] of Object.entries(prefill)) {
    if (!/^r\d+$/.test(id) || !/^#[0-9a-f]{6}$/i.test(hex)) continue
    out = out.replace(new RegExp(`(<path class="region" id="${id}")`), `$1 style="fill:${hex}" data-prefill="1"`)
  }
  return out
}

/**
 * A half-colored copy of the coloring page for the app section's "coming soon" phone.
 * Region ids are removed so they never clash with the interactive hero page on the same screen.
 * Fills are deterministic, so every render looks the same.
 */
export function getAppPreviewArt(season: 'christmas' | 'default', palette: string[], keep: Record<string, string> = {}): string | null {
  const svg =
    season === 'default'
      ? readSvg(DEFAULT_FILE) ?? readSvg(CHRISTMAS_FILE)
      : readSvg(CHRISTMAS_FILE)
  if (!svg || palette.length === 0) return null

  let index = 0
  let out = svg
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/, '')
    .replace(/<svg\b/, '<svg width="100%" height="100%" focusable="false" aria-hidden="true" class="app-preview-svg"')
    .replace(/\srole="img"/, '')
    .replace(/\saria-label="[^"]*"/, '')
    .replace(/<path class="region" id="(r\d+)"/g, (_match, id: string) => {
      index += 1
      // Leave the background and ground white, and about 40% of the rest unfilled, so it reads as "in progress"
      const fill = keep[id] ?? (index > 2 && (index * 37) % 10 < 6 ? palette[(index * 7) % palette.length] : null)
      return fill ? `<path style="fill:${fill}"` : '<path'
    })
    .replace(/\sid="(regions|ink)"/g, '')
  out = out.replace(/\sclass="region"/g, '')
  return out
}
