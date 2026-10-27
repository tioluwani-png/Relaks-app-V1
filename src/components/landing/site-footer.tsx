import Image from 'next/image'
import Link from 'next/link'
import { FOOTER_COLUMNS, FOOTER_TAGLINE, SOCIAL_LINKS } from '@/lib/landing/content'
import { TrackedLink } from './tracked-link'
import { InstagramIcon, TikTokIcon, XIcon, WhatsAppIcon } from './social-icons'

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { key: 'tiktok', label: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
  { key: 'x', label: 'X', href: SOCIAL_LINKS.x, Icon: XIcon },
  { key: 'whatsapp', label: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon },
].filter((s) => s.href)

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white/40">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="block mb-4">
              <Image src="/logo.png" alt="Relaks" width={100} height={34} className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed">{FOOTER_TAGLINE}</p>
            {SOCIALS.length > 0 && (
              <div className="flex gap-2 mt-5">
                {SOCIALS.map(({ key, label, href, Icon }) => (
                  <TrackedLink
                    key={key}
                    href={href}
                    event={`footer_${key}`}
                    aria-label={`Relaks on ${label}`}
                    className="h-9 w-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:text-purple-700 hover:border-purple-200 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </TrackedLink>
                ))}
              </div>
            )}
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold mb-4 text-sm text-gray-900">{column.title}</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <TrackedLink href={link.href} event={link.event} className="hover:text-gray-900 transition-colors">
                      {link.label}
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 mt-10 pt-6">
          <p className="text-sm text-gray-600 text-center">
            &copy; {new Date().getFullYear()} Relaks. Made with{' '}
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">&#9829;</span>
            {' '}for colorists everywhere.
          </p>
        </div>
      </div>
    </footer>
  )
}
