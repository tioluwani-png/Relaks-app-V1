import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { HERO_COLORING } from '@/lib/landing/content'
import { buildPrintPdf } from '@/lib/landing/print-pdf'

// Built once at build time and served as a static file. Out-of-season page, falling back to the Christmas art.
export const dynamic = 'force-static'

export function GET() {
  const file = existsSync(join(process.cwd(), 'public', 'landing', 'hero-page-default.svg'))
    ? 'hero-page-default.svg'
    : 'hero-page.svg'
  const pdf = buildPrintPdf(file, HERO_COLORING.print.default.footer)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="relaks-coloring-page.pdf"',
    },
  })
}
