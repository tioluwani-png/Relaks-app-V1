'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Images, Plus, BookOpen, User, X, Upload, Sparkles, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/references', icon: Images, label: 'References' },
  { href: '#create', icon: Plus, label: 'Create', isCenter: true },
  { href: '/reading', icon: BookOpen, label: 'Reading' },
  { href: '/me', icon: User, label: 'Me' },
]

// Paths where bottom nav should be hidden
const HIDDEN_PATHS = [
  '/shop',
  '/journal/history/',
  '/create/upload',
  '/create/generate',
]

// Check if path should hide bottom nav
function shouldHideNav(pathname: string): boolean {
  // Shop pages (except landing)
  if (pathname.startsWith('/shop/')) return true
  // Journal writing
  if (pathname === '/journal' && !pathname.includes('history')) return false
  // Create flows
  if (pathname.startsWith('/create/')) return true
  // Rent checkout
  if (pathname.startsWith('/rent/checkout')) return true
  return false
}

export function BottomNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (shouldHideNav(pathname)) return null

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/'
    if (href === '/references') return pathname.startsWith('/references') || pathname.startsWith('/discover')
    if (href === '/reading') return pathname.startsWith('/reading') || pathname.startsWith('/books') || pathname.startsWith('/rent')
    if (href === '/me') return pathname.startsWith('/me') || pathname.startsWith('/profile')
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.isCenter) {
              return (
                <button
                  key={item.href}
                  onClick={() => setSheetOpen(true)}
                  className="flex flex-col items-center justify-center -mt-4 min-w-[56px] min-h-[56px]"
                  aria-label="Create"
                >
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
                  >
                    <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </motion.div>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-xl transition-colors',
                  active ? 'text-purple-600' : 'text-foreground/60'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-6 w-6', active && 'stroke-[2.5px]')} />
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-600"
                    />
                  )}
                </div>
                <span className={cn('text-[11px]', active ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Create Bottom Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Create</h2>
                  <button
                    onClick={() => setSheetOpen(false)}
                    className="p-2 -mr-2 rounded-full hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Link
                    href="/create/upload"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Share a colored page</p>
                      <p className="text-sm text-muted-foreground">Upload your artwork to the community</p>
                    </div>
                  </Link>

                  <Link
                    href="/create/generate"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Create an AI page</p>
                      <p className="text-sm text-muted-foreground">Generate a custom coloring page</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 opacity-60 cursor-not-allowed">
                    <div className="h-12 w-12 rounded-xl bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Color on my phone</p>
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                          Coming soon
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Digital coloring experience</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
