import { HERO_COLORING } from '@/lib/landing/content'
import { buildPrintPdf } from '@/lib/landing/print-pdf'

// Built once at build time and served as a static file
export const dynamic = 'force-static'

export function GET() {
  const pdf = buildPrintPdf('hero-page.svg', HERO_COLORING.print.christmas.footer)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="relaks-christmas-coloring-page.pdf"',
    },
  })
}
