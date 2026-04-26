'use client'

import { useState, useEffect } from 'react'
import type { EditionRecord } from '@/types/database'

// Module-level cache to avoid refetching across components
let cachedEditions: EditionRecord[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useEditions() {
  const [editions, setEditions] = useState<EditionRecord[]>(cachedEditions || [])
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
        if (response.ok) {
          cachedEditions = data.editions
          cacheTimestamp = Date.now()
          setEditions(data.editions)
        }
      } catch {
        console.error('Failed to fetch editions')
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
