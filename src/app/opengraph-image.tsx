import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { OG_TAGLINE } from '@/lib/landing/content'

export const alt = 'Relaks: adult coloring books, journaling app and book club'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), 'public', 'logo-square.png'))
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FDF8F5',
          gap: 48,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={260} height={260} alt="" style={{ borderRadius: 48 }} />
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: '#1f2937',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.15,
          }}
        >
          {OG_TAGLINE}
        </div>
      </div>
    ),
    size
  )
}
