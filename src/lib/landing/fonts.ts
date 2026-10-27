import { Fraunces } from 'next/font/google'

// Display face for landing H1/H2 only, so app pages don't download it
export const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
})
