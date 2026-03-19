'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BlogHeaderProps {
  showBackToBlog?: boolean
}

export function BlogHeader({ showBackToBlog = false }: BlogHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FFFBF5]/80 border-b border-gray-100/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
        {showBackToBlog ? (
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Blog</span>
          </Link>
        ) : (
          <Link href={isLoggedIn ? '/feed' : '/'}>
            <Image
              src="/logo.png"
              alt="Relaks"
              width={120}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>
        )}

        <nav className="hidden md:flex items-center gap-6">
          {isLoggedIn ? (
            <Link href="/feed" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Feed</Link>
          ) : (
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Home</Link>
          )}
          <Link href="/blog" className="text-sm font-medium text-purple-600 transition-colors">Blog</Link>
          <Link href="/blog/submit" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Submit Story</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/blog/submit"
            className="md:hidden inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 px-3 py-2 rounded-full border border-purple-200 hover:bg-purple-50 transition-colors"
          >
            <PenLine size={15} />
            <span className="hidden sm:inline">Submit</span>
          </Link>
          {isLoggedIn ? (
            <Link href="/feed">
              <button className="text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300">
                Back to App
              </button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-full transition-colors">
                  Log in
                </button>
              </Link>
              <Link href="/signup">
                <button className="text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300">
                  Start Coloring
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
