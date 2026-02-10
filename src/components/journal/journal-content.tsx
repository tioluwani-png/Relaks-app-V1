'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Flame, Calendar, ChevronRight, ChevronDown, Loader2, Check, Sparkles, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import {
  getTodaysPrompt,
  getRandomPromptFromCategory,
  getRandomPrompt,
  getAllCategories,
  categoryLabels,
  categoryEmojis,
  type PromptCategory,
  type JournalPrompt,
} from '@/lib/journal-prompts'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/shared/motion'
import { motion } from 'framer-motion'
import type { Mood } from '@/types/database'

const moods: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😔', label: 'Bad' },
  { value: 'terrible', emoji: '😢', label: 'Terrible' },
]

export function JournalContent() {
  const { profile, refreshProfile } = useAuth()
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [promptUsed, setPromptUsed] = useState<string | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt>(getTodaysPrompt)
  const [showPromptPicker, setShowPromptPicker] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  // Auto-save effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (content.trim() && !isSaving) {
        handleSave(true)
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [content, selectedMood]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load today's entry
  useEffect(() => {
    const loadEntry = async () => {
      try {
        const response = await fetch(`/api/journal/${today}`)
        if (response.ok) {
          const data = await response.json()
          if (data.entry) {
            setContent(data.entry.content || '')
            setSelectedMood(data.entry.mood)
            setPromptUsed(data.entry.prompt_used)
          }
        }
        // Silently ignore errors - user might not have an entry yet
      } catch {
        // Ignore - no entry for today is fine
      }
    }

    if (profile) {
      loadEntry()
    }
  }, [today, profile])

  const handleSave = async (isAutoSave = false) => {
    if (!content.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mood: selectedMood,
          prompt_used: promptUsed,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
        if (!isAutoSave) {
          toast.success(data.isNew ? 'Entry saved! Streak updated.' : 'Entry updated!')
          refreshProfile()
        }
      } else {
        if (!isAutoSave) toast.error(data.error || 'Failed to save')
      }
    } catch {
      if (!isAutoSave) toast.error('Failed to save entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUsePrompt = () => {
    setPromptUsed(currentPrompt.text)
    setContent(prev => prev ? `${currentPrompt.text}\n\n${prev}` : `${currentPrompt.text}\n\n`)
  }

  const handlePickCategory = (category: PromptCategory) => {
    setCurrentPrompt(getRandomPromptFromCategory(category))
    setShowPromptPicker(false)
  }

  const handleSurpriseMe = () => {
    setCurrentPrompt(getRandomPrompt())
    setShowPromptPicker(false)
  }

  const streak = profile?.journal_streak || 0

  return (
    <div className="p-4 space-y-4">
      {/* Streak Display */}
      <FadeIn>
        <Card className="overflow-hidden border-0 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
          <div className="gradient-purple-pink p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Flame className="h-6 w-6" />
                </motion.div>
                <span className="font-semibold">Journal Streak</span>
              </div>
              <Link href="/journal/history">
                <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/20 rounded-xl">
                  <Calendar className="h-4 w-4 mr-1" />
                  History
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="text-4xl font-bold">{streak} days</div>
            <p className="text-sm text-white/80 mt-1">
              {streak === 0
                ? 'Start your streak today!'
                : streak >= 7
                ? "Amazing! You're on fire!"
                : "Keep it up! You're doing great."}
            </p>
          </div>
        </Card>
      </FadeIn>

      {/* Today's Entry */}
      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.06)] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mood Selector */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">How are you feeling?</p>
              <div className="flex justify-between">
                {moods.map((mood) => (
                  <motion.button
                    key={mood.value}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedMood(mood.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                      selectedMood === mood.value
                        ? 'bg-purple-50 dark:bg-purple-950/30 ring-2 ring-purple-500/30'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      'text-2xl transition-transform',
                      selectedMood === mood.value && 'scale-110'
                    )}>
                      {mood.emoji}
                    </span>
                    <span className={cn(
                      'text-xs',
                      selectedMood === mood.value
                        ? 'text-purple-600 dark:text-purple-400 font-medium'
                        : 'text-muted-foreground'
                    )}>
                      {mood.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Entry Textarea */}
            <div>
              <Textarea
                placeholder="What's on your mind today? How did your coloring session go?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none rounded-xl focus-visible:ring-purple-500/30"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {content.split(/\s+/).filter(Boolean).length} words
                  {isSaved && (
                    <span className="ml-2 text-green-600 inline-flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Saved
                    </span>
                  )}
                </span>
                <Button
                  onClick={() => handleSave()}
                  disabled={!content.trim() || isSaving}
                  className="rounded-xl gradient-purple-pink text-white border-0"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Entry'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Prompt Picker */}
      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.06)] rounded-2xl bg-purple-50/50 dark:bg-purple-950/10">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-sm">
                  {categoryEmojis[currentPrompt.category]} {categoryLabels[currentPrompt.category]}
                </span>
              </div>
              <button
                onClick={() => setShowPromptPicker(!showPromptPicker)}
                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium"
              >
                Change
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showPromptPicker && 'rotate-180')} />
              </button>
            </div>

            <p className="text-sm italic text-muted-foreground mb-3">
              &quot;{currentPrompt.text}&quot;
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={handleUsePrompt}
              disabled={promptUsed === currentPrompt.text}
            >
              {promptUsed === currentPrompt.text ? 'Prompt Added' : 'Use This Prompt'}
            </Button>

            {showPromptPicker && (
              <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-800/30">
                <p className="text-xs text-muted-foreground mb-3">Pick a category:</p>
                <div className="grid grid-cols-2 gap-2">
                  {getAllCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => handlePickCategory(category)}
                      className={cn(
                        'p-2.5 rounded-xl text-left text-xs font-medium transition-colors',
                        currentPrompt.category === category
                          ? 'bg-purple-500 text-white'
                          : 'bg-background hover:bg-purple-100 dark:hover:bg-purple-950/30'
                      )}
                    >
                      {categoryEmojis[category]} {categoryLabels[category]}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 rounded-xl"
                  onClick={handleSurpriseMe}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Surprise Me
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
