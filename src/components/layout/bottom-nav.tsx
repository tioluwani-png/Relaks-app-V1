'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Images, Plus, Library, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const navItems = [
  {
    href: '/feed',
    icon: Home,
    label: 'Home',
  },
  {
    href: '/references',
    icon: Images,
    label: 'References',
  },
  {
    href: '/create',
    icon: Plus,
    label: 'Create',
    isCenter: true,
  },
  {
    href: '/books',
    icon: Library,
    label: 'Books',
  },
  {
    href: '/profile',
    icon: User,
    label: 'Profile',
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center -mt-5"
              >
                <motion.div
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-14 w-14 rounded-2xl gradient-purple-pink flex items-center justify-center shadow-[0_4px_14px_rgba(168,85,247,0.4)]"
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                </motion.div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors relative',
                isActive
                  ? 'text-purple-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
              </motion.div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-6 h-1 rounded-full gradient-purple-pink"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
