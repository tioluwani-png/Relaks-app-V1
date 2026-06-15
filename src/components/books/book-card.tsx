'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Bookmark, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { BookWithGenre } from '@/types/database'

interface BookCardProps {
  book: BookWithGenre
  showActions?: boolean
}

export function BookCard({ book, showActions = true }: BookCardProps) {
  const [isLiked, setIsLiked] = useState(book.is_liked || false)
  const [isSaved, setIsSaved] = useState(book.is_saved || false)
  const [likeCount, setLikeCount] = useState(book.like_count)
  const [saveCount, setSaveCount] = useState(book.save_count)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSaveLoading, setIsSaveLoading] = useState(false)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLikeLoading) return
    setIsLikeLoading(true)

    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

    try {
      const response = await fetch(`/api/books/${book.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsLiked(isLiked)
        setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      }
    } catch (err) {
      console.error('[BookCard] Like toggle failed:', err)
      setIsLiked(isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSaveLoading) return
    setIsSaveLoading(true)

    setIsSaved(!isSaved)
    setSaveCount(prev => isSaved ? prev - 1 : prev + 1)

    try {
      const response = await fetch(`/api/books/${book.id}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsSaved(isSaved)
        setSaveCount(prev => isSaved ? prev + 1 : prev - 1)
      }
    } catch (err) {
      console.error('[BookCard] Save toggle failed:', err)
      setIsSaved(isSaved)
      setSaveCount(prev => isSaved ? prev + 1 : prev - 1)
    } finally {
      setIsSaveLoading(false)
    }
  }

  return (
    <Link href={`/books/${book.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      >
        {/* Book Cover */}
        <div className="relative aspect-[2/3] bg-gray-100 dark:bg-gray-800">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
              <span className="text-4xl font-bold text-purple-300 dark:text-purple-700">
                {book.title.charAt(0)}
              </span>
            </div>
          )}

          {/* Genre badge */}
          {book.genre && (
            <div
              className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: book.genre.color }}
            >
              {book.genre.name}
            </div>
          )}

          {/* Reading status badge */}
          {book.user_read_status && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white">
              {book.user_read_status === 'reading' && 'Reading'}
              {book.user_read_status === 'read' && 'Read'}
              {book.user_read_status === 'want_to_read' && 'Want to Read'}
              {book.user_read_status === 'dnf' && 'DNF'}
            </div>
          )}

          {/* Quick actions overlay */}
          {showActions && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
              <div className="flex gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSave}
                  className={cn(
                    'p-2 rounded-full backdrop-blur-sm transition-colors',
                    isSaved
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/80 text-gray-700 hover:bg-white'
                  )}
                >
                  <Bookmark
                    className={cn('h-4 w-4', isSaved && 'fill-current')}
                  />
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
            {book.author}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <button
              onClick={handleLike}
              className={cn(
                'flex items-center gap-1 transition-colors',
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
              <span>{likeCount}</span>
            </button>
            <div className="flex items-center gap-1">
              <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current text-purple-500')} />
              <span>{saveCount}</span>
            </div>
            {book.user_rating && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{book.user_rating}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
