import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

/**
 * Builds a blank, printable A4 PDF of the hero coloring page with no dependencies:
 * the SVG's ink layer becomes vector paths (sharp at any print size), the Relaks logo is
 * embedded as an image, and the footer uses the built-in Helvetica font.
 * Served by the static routes in src/app/landing/, so it's generated once at build time.
 */

const A4_W = 595.28
const A4_H = 841.89
const MARGIN = 40
const FOOTER_H = 64
const INK = '0.118 0.118 0.173' // #1E1E2C

// Helvetica widths (1/1000 em) for ASCII 32-126, from the standard Adobe metrics
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

function textWidth(text: string, size: number) {
  let w = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    w += code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556
  }
  return (w / 1000) * size
}

const pdfString = (text: string) => `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`
const n = (v: number) => (Math.round(v * 100) / 100).toString()

/** SVG path data using only M/Z with implicit line-tos (as in the hero page) -> PDF path operators. */
function svgPathToPdf(d: string): string {
  const out: string[] = []
  const tokens = d.match(/[MmZzLl]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  let i = 0
  let first = true
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === 'M' || t === 'L') {
      first = t === 'M'
      i++
      continue
    }
    if (t === 'Z' || t === 'z') {
      out.push('h')
      first = true
      i++
      continue
    }
    const x = Number(tokens[i])
    const y = Number(tokens[i + 1])
    out.push(`${n(x)} ${n(y)} ${first ? 'm' : 'l'}`)
    first = false
    i += 2
  }
  return out.join('\n')
}

/** RGB, 8-bit, non-interlaced PNG -> raw IDAT bytes a PDF can use directly with the PNG predictor. */
function readPng(file: string): { width: number; height: number; data: Buffer } | null {
  if (!existsSync(file)) return null
  const buf = readFileSync(file)
  if (buf.readUInt32BE(0) !== 0x89504e47) return null
  let offset = 8
  let width = 0
  let height = 0
  let ok = false
  const idat: Buffer[] = []
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const body = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      // bit depth 8, colour type 2 (RGB), no interlace
      ok = body[8] === 8 && body[9] === 2 && body[12] === 0
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + len
  }
  return ok ? { width, height, data: Buffer.concat(idat) } : null
}

export function buildPrintPdf(svgFile: string, footerText: string): Buffer {
  const dir = join(process.cwd(), 'public')
  const svg = readFileSync(join(dir, 'landing', svgFile), 'utf8')
  const [, , vbW, vbH] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 633 930').split(/[\s,]+/).map(Number)
  const ink = svg.match(/<path id="ink" d="([^"]+)"/)?.[1] ?? ''
  const logo = readPng(join(dir, 'logo-square.png'))

  // Fit the page into A4 inside the margins, above the footer, centred
  const availW = A4_W - MARGIN * 2
  const availH = A4_H - MARGIN * 2 - FOOTER_H
  const scale = Math.min(availW / vbW, availH / vbH)
  const artW = vbW * scale
  const artH = vbH * scale
  const artX = (A4_W - artW) / 2
  const artTop = A4_H - MARGIN - (availH - artH) / 2

  // Footer: small logo + one line of text, centred together
  const fontSize = 10
  const logoSize = 28
  const gap = 8
  const tw = textWidth(footerText, fontSize)
  const rowW = (logo ? logoSize + gap : 0) + tw
  const rowX = (A4_W - rowW) / 2
  const rowY = MARGIN + (FOOTER_H - logoSize) / 2

  const content = [
    // Page art: flip SVG's y-down coordinates into PDF's y-up space
    'q',
    `${INK} rg`,
    `${n(scale)} 0 0 ${n(-scale)} ${n(artX)} ${n(artTop)} cm`,
    svgPathToPdf(ink),
    'f*',
    'Q',
    logo ? `q ${logoSize} 0 0 ${logoSize} ${n(rowX)} ${n(rowY)} cm /Logo Do Q` : '',
    'BT',
    `/F1 ${fontSize} Tf`,
    `${INK} rg`,
    `${n(rowX + (logo ? logoSize + gap : 0))} ${n(rowY + (logoSize - fontSize) / 2 + 2)} Td`,
    `${pdfString(footerText)} Tj`,
    'ET',
  ].join('\n')

  const stream = deflateSync(Buffer.from(content, 'latin1'))

  const objects: (string | Buffer)[] = []
  const add = (o: string | Buffer) => objects.push(o) // object number = index + 1

  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Contents 4 0 R ` +
      `/Resources << /Font << /F1 5 0 R >>${logo ? ' /XObject << /Logo 6 0 R >>' : ''} >> >>`
  )
  add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]))
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  if (logo) {
    add(
      Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB ` +
            `/BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${logo.width} >> ` +
            `/Length ${logo.data.length} >>\nstream\n`,
          'latin1'
        ),
        logo.data,
        Buffer.from('\nendstream', 'latin1'),
      ])
    )
  }
  add(`<< /Title ${pdfString('Relaks coloring page')} /Author (Relaks) /Creator (relaks.co) >>`)
  const infoRef = objects.length

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')]
  let size = parts[0].length
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(size)
    const body = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, 'latin1'),
      typeof obj === 'string' ? Buffer.from(obj, 'latin1') : obj,
      Buffer.from('\nendobj\n', 'latin1'),
    ])
    parts.push(body)
    size += body.length
  })
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.map((o) => `${o.toString().padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoRef} 0 R >>`,
    'startxref',
    `${size}`,
    '%%EOF',
  ].join('\n')
  parts.push(Buffer.from(xref, 'latin1'))
  return Buffer.concat(parts)
}
