'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { FadeIn } from '@/components/shared/motion'
import type { Mood } from '@/types/database'

interface JournalEntry {
  id: string
  entry_date: string
  content: string
  mood: Mood | null
  prompt_used: string | null
  word_count: number
  updated_at: string
}

const moodEmojis: Record<string, string> = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  bad: '😔',
  terrible: '😢',
}

const moodLabels: Record<string, string> = {
  great: 'Feeling Great',
  good: 'Feeling Good',
  okay: 'Feeling Okay',
  bad: 'Feeling Bad',
  terrible: 'Feeling Terrible',
}

export default function JournalEntryPage({ params }: { params: Promise<{ date: string }> }) {
  const { date: entryDate } = use(params)
  const router = useRouter()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        const response = await fetch(`/api/journal/${entryDate}`)
        const data = await response.json()
        if (response.ok && data.entry) {
          setEntry(data.entry)
        }
      } catch {
        console.error('Failed to fetch entry')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntry()
  }, [entryDate])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/journal/${entryDate}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Entry deleted')
        router.replace('/journal/history')
      } else {
        toast.error('Failed to delete entry')
      }
    } catch {
      toast.error('Failed to delete entry')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.push('/journal/history')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-sm font-semibold truncate">
              {isLoading ? 'Loading...' : formatFullDate(entryDate)}
            </h1>
          </div>
          {entry && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !entry ? (
          <div className="text-center py-12">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="font-semibold mb-1">No entry found</h3>
            <p className="text-sm text-muted-foreground">No journal entry for this date</p>
          </div>
        ) : (
          <FadeIn>
            {/* Mood */}
            {entry.mood && (
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                <span className="text-3xl">{moodEmojis[entry.mood]}</span>
                <span className="font-medium">{moodLabels[entry.mood]}</span>
              </div>
            )}

            {/* Prompt */}
            {entry.prompt_used && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Prompt</p>
                <p className="text-sm italic text-muted-foreground">&quot;{entry.prompt_used}&quot;</p>
              </div>
            )}

            {/* Content */}
            <div className="p-5 rounded-xl border bg-card">
              {entry.content.split('\n').map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed mb-3 last:mb-0">
                  {paragraph || '\u00A0'}
                </p>
              ))}
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{entry.word_count} words</span>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  )
}
