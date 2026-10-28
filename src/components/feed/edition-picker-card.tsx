'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useEditions } from '@/hooks/use-editions'
import { useAuth } from '@/hooks/use-auth'

const DISMISS_KEY = 'relaks_edition_picker_dismissed'

export function EditionPickerCard() {
  const { profile, refreshProfile } = useAuth()
  const { editions } = useEditions()
  const supabase = createClient()

  const [isDismissed, setIsDismissed] = useState(true)
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [noBook, setNoBook] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Check if user has already set editions or dismissed this card
    if (!profile) return

    const hasEditions = (profile.editions_owned as string[])?.length > 0
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    const onboardingComplete = (profile as { onboarding_completed?: boolean }).onboarding_completed

    // Show if user has no editions set and hasn't dismissed
    setIsDismissed(hasEditions || dismissed || onboardingComplete === true)
  }, [profile])

  const toggleEdition = (slug: string) => {
    if (noBook) setNoBook(false)
    setSelectedEditions(prev =>
      prev.includes(slug)
        ? prev.filter(e => e !== slug)
        : [...prev, slug]
    )
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setIsDismissed(true)
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          editions_owned: noBook ? [] : selectedEditions,
          onboarding_completed: true,
        } as never)
        .eq('id', profile.id)

      if (error) {
        toast.error('Failed to save. Try again.')
        return
      }

      toast.success('Saved!')
      refreshProfile?.()
      setIsDismissed(true)
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isDismissed || !profile) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-[20px] p-4 mb-4"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 mb-3 pr-8">
          <BookOpen className="h-4 w-4 text-purple-600" strokeWidth={1.75} />
          <span className="text-sm font-semibold">Which Relaks book do you have?</span>
        </div>

        <div className="space-y-2 mb-4">
          {editions.slice(0, 4).map(ed => (
            <label
              key={ed.slug}
              className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all bg-white/50 dark:bg-black/10 ${
                selectedEditions.includes(ed.slug)
                  ? 'border-purple-500'
                  : 'border-transparent hover:border-purple-300'
              }`}
            >
              <Checkbox
                checked={selectedEditions.includes(ed.slug)}
                onCheckedChange={() => toggleEdition(ed.slug)}
                className="rounded-md h-4 w-4"
              />
              <div className="flex items-center gap-2 flex-1">
                {ed.cover_image_url ? (
                  <Image
                    src={ed.cover_image_url}
                    alt={ed.display_name}
                    width={28}
                    height={37}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <div className="w-7 h-[37px] rounded-md bg-gradient-to-br from-purple-400 to-pink-400" />
                )}
                <span className="text-sm font-medium">{ed.display_name}</span>
              </div>
            </label>
          ))}

          <label
            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all bg-white/50 dark:bg-black/10 ${
              noBook
                ? 'border-purple-500'
                : 'border-transparent hover:border-purple-300'
            }`}
          >
            <Checkbox
              checked={noBook}
              onCheckedChange={() => {
                setNoBook(true)
                setSelectedEditions([])
              }}
              className="rounded-md h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">I don't have one yet</span>
          </label>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || (selectedEditions.length === 0 && !noBook)}
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}
