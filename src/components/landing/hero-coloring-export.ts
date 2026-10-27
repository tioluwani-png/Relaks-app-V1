/**
 * Builds a 1080x1350 PNG of the colored page in a cream festive frame with the Relaks logo,
 * then opens the share sheet (WhatsApp etc.) or downloads it where file sharing isn't supported.
 * Loaded on demand when someone taps Share, so it isn't part of the coloring island.
 */

const W = 1080
const H = 1350
const CREAM = '#FDF8F5'
const INK = '#1E1E2C'

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** The page as standalone SVG markup with its current fills and no interactive attributes. */
function pageMarkup(svg: SVGSVGElement): { inner: string; viewBox: string } {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-pressed]').forEach((el) => el.removeAttribute('data-pressed'))
  return {
    inner: clone.innerHTML,
    viewBox: svg.getAttribute('viewBox') ?? '0 0 633 930',
  }
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function frameSvg(page: { inner: string; viewBox: string }, logo: string | null, footer: string) {
  const [, , vbW, vbH] = page.viewBox.split(/\s+/).map(Number)
  const pageH = 960
  const pageW = Math.round((pageH * vbW) / vbH)
  const pageX = (W - pageW) / 2
  const pageY = 96

  // Small berry and holly dots along the frame
  const dots = Array.from({ length: 18 }, (_, i) => {
    const t = (i + 0.5) / 18
    const colour = i % 2 === 0 ? '#C8102E' : '#1B7A43'
    return `<circle cx="${40 + t * (W - 80)}" cy="40" r="5" fill="${colour}"/><circle cx="${40 + t * (W - 80)}" cy="${H - 40}" r="5" fill="${colour}"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="36" fill="none" stroke="#C8102E" stroke-opacity="0.55" stroke-width="3"/>
  <rect x="58" y="58" width="${W - 116}" height="${H - 116}" rx="24" fill="none" stroke="#1B7A43" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"/>
  ${dots}
  <rect x="${pageX - 16}" y="${pageY - 16}" width="${pageW + 32}" height="${pageH + 32}" rx="24" fill="#ffffff"/>
  <svg x="${pageX}" y="${pageY}" width="${pageW}" height="${pageH}" viewBox="${page.viewBox}">${page.inner}</svg>
  ${logo ? `<image href="${logo}" xlink:href="${logo}" x="${W / 2 - 110}" y="${pageY + pageH + 40}" width="220" height="91" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="${W / 2}" y="${H - 84}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" fill="${INK}">${escapeXml(footer)}</text>
</svg>`
}

async function renderPng(markup: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, 0, 0, W, H)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), 'image/png')
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function shareColoring(svg: SVGSVGElement, opts: { footer: string; fileName: string }) {
  const logo = await toDataUrl('/logo.png')
  const blob = await renderPng(frameSvg(pageMarkup(svg), logo, opts.footer))
  const file = new File([blob], opts.fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: opts.footer })
      return
    } catch (error) {
      // Cancelled by the person: nothing to do
      if (error instanceof DOMException && error.name === 'AbortError') return
      // Otherwise (e.g. the browser dropped the tap's permission while the image was built), download instead
    }
  }
  download(blob, opts.fileName)
}
