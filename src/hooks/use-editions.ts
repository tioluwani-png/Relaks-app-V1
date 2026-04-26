'use client'

import { useState, useEffect } from 'react'
import type { EditionRecord } from '@/types/database'

// Fallback editions if the API/DB isn't available yet
const FALLBACK_EDITIONS: EditionRecord[] = [
  { id: '', slug: 'lavender', display_name: 'Lavender Edition', description: null, color: '#8b5cf6', gradient_from: 'from-purple-500', gradient_to: 'to-violet-600', gradient_bg: 'bg-purple-50 dark:bg-purple-950/30', cover_image_url: null, is_active: true, display_order: 0, created_at: '', updated_at: '' },
  { id: '', slug: 'pink', display_name: 'Pink Edition', description: null, color: '#ec4899', gradient_from: 'from-pink-500', gradient_to: 'to-rose-500', gradient_bg: 'bg-pink-50 dark:bg-pink-950/30', cover_image_url: null, is_active: true, display_order: 1, created_at: '', updated_at: '' },
  { id: '', slug: 'christmas', display_name: 'Christmas Edition', description: null, color: '#ef4444', gradient_from: 'from-red-500', gradient_to: 'to-green-600', gradient_bg: 'bg-red-50 dark:bg-red-950/30', cover_image_url: null, is_active: true, display_order: 2, created_at: '', updated_at: '' },
]

// Module-level cache to avoid refetching across components
let cachedEditions: EditionRecord[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useEditions() {
  const [editions, setEditions] = useState<EditionRecord[]>(cachedEditions || FALLBACK_EDITIONS)
  const [isLoading, setIsLoading] = useState(!cachedEditions)

  useEffect(() => {
    const now = Date.now()
    if (cachedEditions && now - cacheTimestamp < CACHE_TTL) {
      setEditions(cachedEditions)
      setIsLoading(false)
      return
    }

    const fetchEditions = async () => {
      try {
        const response = await fetch('/api/editions')
        const data = await response.json()
        if (response.ok && data.editions && data.editions.length > 0) {
          cachedEditions = data.editions
          cacheTimestamp = Date.now()
          setEditions(data.editions)
        } else {
          // API returned empty or error — use fallbacks
          setEditions(FALLBACK_EDITIONS)
        }
      } catch {
        console.error('Failed to fetch editions')
        setEditions(FALLBACK_EDITIONS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEditions()
  }, [])

  const getEdition = (slug: string) => editions.find(e => e.slug === slug)

  const getEditionName = (slug: string) => {
    const edition = getEdition(slug)
    return edition?.display_name || `${slug.charAt(0).toUpperCase() + slug.slice(1)} Edition`
  }

  const getEditionGradient = (slug: string) => {
    const edition = getEdition(slug)
    return edition
      ? { from: edition.gradient_from, to: edition.gradient_to, bg: edition.gradient_bg }
      : { from: 'from-purple-500', to: 'to-violet-600', bg: 'bg-purple-50 dark:bg-purple-950/30' }
  }

  const invalidateCache = () => {
    cachedEditions = null
    cacheTimestamp = 0
  }

  return { editions, isLoading, getEdition, getEditionName, getEditionGradient, invalidateCache }
}
