import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { FOOTER_COLUMNS, FOOTER_TAGLINE, SOCIAL_LINKS } from '@/lib/landing/content'
import { TrackedLink } from './tracked-link'
import type { Tone } from './section'
import { InstagramIcon, TikTokIcon, XIcon, WhatsAppIcon } from './social-icons'

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { key: 'tiktok', label: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
  { key: 'x', label: 'X', href: SOCIAL_LINKS.x, Icon: XIcon },
  { key: 'whatsapp', label: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon },
].filter((s) => s.href)

export function SiteFooter({ tone = 'tint' }: { tone?: Tone }) {
  return (
    <footer className={`border-t border-relaks-ink/10 ${tone === 'tint' ? 'bg-relaks-tint' : 'bg-relaks-cream'}`}>
      <div className="container mx-auto px-4 py-10 md:py-14 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-6">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex min-h-11 items-center mb-2">
              <Image src="/logo.png" alt="Relaks" width={100} height={41} className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-gray-700 leading-relaxed max-w-[40ch]">{FOOTER_TAGLINE}</p>
            {SOCIALS.length > 0 && (
              <div className="flex gap-2 mt-4">
                {SOCIALS.map(({ key, label, href, Icon }) => (
                  <TrackedLink
                    key={key}
                    href={href}
                    event={`footer_${key}`}
                    aria-label={`Relaks on ${label}`}
                    className="h-11 w-11 rounded-full bg-white border border-relaks-ink/15 flex items-center justify-center text-relaks-ink hover:border-relaks-coral transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                  </TrackedLink>
                ))}
              </div>
            )}
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="font-semibold mb-1 text-sm text-relaks-ink">{column.title}</h2>
              <ul className="text-sm text-gray-700">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <TrackedLink
                      href={link.href}
                      event={link.event}
                      className="inline-flex min-h-11 items-center hover:text-relaks-ink hover:underline underline-offset-2"
                    >
                      {link.label}
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-relaks-ink/10 mt-8 pt-6">
          <p className="text-sm text-gray-700 text-center">
            &copy; {new Date().getFullYear()} Relaks. Made with{' '}
            <Heart className="inline h-4 w-4 -mt-0.5 fill-relaks-coral text-relaks-coral" aria-label="love" />
            {' '}for colorists everywhere.
          </p>
        </div>
      </div>
    </footer>
  )
}
