import 'server-only'
import { adultBooks, getLandingClubInfo, getLandingProducts, getNewestPost } from './data'

/**
 * Landing photo slots.
 * Drop a file with the listed name into public/landing/ and rebuild to use it.
 * Until then each slot falls back to live data, so the page is never broken.
 */
export const LANDING_IMAGE_FILES = {
  hero: 'hero.jpg',
  doorBooks: 'door-books.jpg',
  doorClub: 'door-club.jpg',
  doorApp: 'door-app.jpg',
  appCanvas: 'app-canvas.png',
  appReferences: 'app-references.png',
  appJournal: 'app-journal.png',
  appFeed: 'app-feed.png',
  founder: 'founder.jpg',
} as const

export type LandingImageSlot = keyof typeof LANDING_IMAGE_FILES

/** A plain photo, or a phone frame showing a screen (or a branded placeholder when `src` is null). */
export type LandingImage =
  | { kind: 'photo'; src: string; alt: string }
  | { kind: 'phone'; src: string | null; alt: string; label: string }

// Filled in by next.config.ts at build time
const PRESENT = new Set((process.env.LANDING_IMAGES ?? '').split(',').filter(Boolean))

function localFile(slot: LandingImageSlot): string | null {
  const file = LANDING_IMAGE_FILES[slot]
  return PRESENT.has(file) ? `/landing/${file}` : null
}

function appScreen(slot: LandingImageSlot, label: string): LandingImage {
  return { kind: 'phone', src: localFile(slot), alt: `${label} in the Relaks app`, label }
}

export interface LandingImages {
  hero: LandingImage | null
  doorBooks: LandingImage | null
  doorClub: LandingImage | null
  doorApp: LandingImage
  appCanvas: LandingImage
  appReferences: LandingImage
  appJournal: LandingImage
  appFeed: LandingImage
  founder: LandingImage | null
}

export async function getLandingImages(): Promise<LandingImages> {
  const [products, club, newestPost] = await Promise.all([
    getLandingProducts(),
    getLandingClubInfo(),
    getNewestPost(),
  ])

  const candidates = adultBooks(products.filter((p) => p.product.images.length > 0))
  const heroProduct = candidates[0]?.product
  const doorProduct = (candidates[1] ?? candidates[0])?.product

  const photo = (slot: LandingImageSlot, alt: string, fallback?: { src: string; alt: string } | null) => {
    const file = localFile(slot)
    if (file) return { kind: 'photo' as const, src: file, alt }
    return fallback ? { kind: 'photo' as const, ...fallback } : null
  }

  const doorAppFile = localFile('doorApp')

  return {
    hero: photo(
      'hero',
      'Relaks adult coloring books and colored pages',
      heroProduct && { src: heroProduct.images[0], alt: heroProduct.name }
    ),
    doorBooks: photo(
      'doorBooks',
      'Relaks coloring books',
      doorProduct && { src: doorProduct.images[0], alt: doorProduct.name }
    ),
    doorClub: photo(
      'doorClub',
      'Books from the Relaks Reading Club',
      club.newestCoverUrl ? { src: club.newestCoverUrl, alt: 'Newest book in the Reading Club' } : null
    ),
    doorApp: doorAppFile
      ? { kind: 'photo', src: doorAppFile, alt: 'The Relaks coloring app' }
      : {
          kind: 'phone',
          src: newestPost?.imageUrl ?? null,
          alt: newestPost ? `A page colored by ${newestPost.colorist}` : 'The Relaks coloring app',
          label: 'The Relaks app',
        },
    appCanvas: appScreen('appCanvas', 'Coloring canvas'),
    appReferences: appScreen('appReferences', 'Color references'),
    appJournal: appScreen('appJournal', 'Journal'),
    // The AI row uses the app-feed.png slot
    appFeed: appScreen('appFeed', 'AI coloring pages'),
    founder: photo('founder', 'The founder of Relaks'),
  }
}
