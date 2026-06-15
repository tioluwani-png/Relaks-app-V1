'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { BookGenre } from '@/types/database'

interface BookFiltersProps {
  genres: BookGenre[]
  selectedGenre: string | null
  searchQuery: string
  sortBy: 'newest' | 'oldest' | 'most_saved' | 'most_liked'
  onGenreChange: (genre: string | null) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: 'newest' | 'oldest' | 'most_saved' | 'most_liked') => void
}

export function BookFilters({
  genres,
  selectedGenre,
  searchQuery,
  sortBy,
  onGenreChange,
  onSearchChange,
  onSortChange,
}: BookFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search books or authors..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-purple-50 border-purple-200 text-purple-600')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                  Sort by
                </label>
                <Select value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most_saved">Most Saved</SelectItem>
                    <SelectItem value="most_liked">Most Liked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Genre Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onGenreChange(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            !selectedGenre
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          All
        </motion.button>
        {genres.map((genre) => (
          <motion.button
            key={genre.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGenreChange(genre.slug)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedGenre === genre.slug
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            style={selectedGenre === genre.slug ? { backgroundColor: genre.color } : undefined}
          >
            {genre.name}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
