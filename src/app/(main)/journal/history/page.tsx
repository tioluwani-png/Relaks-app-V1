'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { FadeIn } from '@/components/shared/motion'
import type { Mood } from '@/types/database'

interface JournalEntry {
  id: string
  entry_date: string
  content: string
  mood: Mood | null
  word_count: number
}

const moodEmojis: Record<string, string> = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  bad: '😔',
  terrible: '😢',
}

export default function JournalHistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/journal')
        const data = await response.json()
        if (response.ok) {
          setEntries(data.entries || [])
        }
      } catch {
        console.error('Failed to fetch journal entries')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntries()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (dateString === todayStr) return 'Today'
    if (dateString === yesterdayStr) return 'Yesterday'

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">Journal History</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Stats */}
        <FadeIn>
          <div className="gradient-purple-pink rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Entries</p>
                <p className="text-3xl font-bold">{entries.length}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Entries */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="font-semibold mb-1">No entries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start journaling to see your history</p>
            <Link href="/journal">
              <Button variant="outline" size="sm" className="rounded-xl">
                Write your first entry
              </Button>
            </Link>
          </div>
        ) : (
          <FadeIn delay={0.1}>
            <div className="space-y-2">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/history/${entry.entry_date}`}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl">
                    {entry.mood ? moodEmojis[entry.mood] || '📝' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{formatDate(entry.entry_date)}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {entry.content || 'No content'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.word_count} words
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  )
}
