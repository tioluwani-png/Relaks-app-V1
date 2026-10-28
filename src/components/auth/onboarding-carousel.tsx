'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, ChevronRight, Bell, BookOpen, Users } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditions } from '@/hooks/use-editions'

interface FollowSuggestion {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export function OnboardingCarousel() {
  const router = useRouter()
  const supabase = createClient()
  const { editions } = useEditions()

  const [step, setStep] = useState(0)
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [noBook, setNoBook] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([])
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const totalSteps = 3

  // Fetch follow suggestions when we reach step 2
  useEffect(() => {
    if (step === 2) {
      const editionParam = selectedEditions.length > 0 ? `?edition=${selectedEditions[0]}` : ''
      fetch(`/api/users/suggestions${editionParam}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.users || []))
        .catch(() => {})
    }
  }, [step, selectedEditions])

  const toggleEdition = (slug: string) => {
    if (noBook) setNoBook(false)
    setSelectedEditions(prev =>
      prev.includes(slug)
        ? prev.filter(e => e !== slug)
        : [...prev, slug]
    )
  }

  const handleNoBook = () => {
    setNoBook(true)
    setSelectedEditions([])
  }

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
      if (permission === 'granted') {
        toast.success('Notifications enabled!')
      }
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
      })
      if (response.ok) {
        setFollowedUsers(prev => new Set([...prev, userId]))
        toast.success('Followed!')
      }
    } catch {
      toast.error('Failed to follow')
    }
  }

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1)
    }
  }

  const handleSkip = () => {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please log in to continue')
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          editions_owned: noBook ? [] : selectedEditions,
          onboarding_completed: true,
        } as never)
        .eq('id', user.id)

      if (error) {
        toast.error('Failed to save preferences')
        return
      }

      toast.success('Welcome to Relaks!')
      window.location.href = '/feed'
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Which book do you have? */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
                    <BookOpen className="h-7 w-7 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-xl font-bold font-display">Which Relaks book do you have?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
                </div>

                <div className="space-y-2">
                  {editions.map(ed => (
                    <label
                      key={ed.slug}
                      className={`flex items-center gap-3 p-3 rounded-[20px] border-2 cursor-pointer transition-all ${
                        selectedEditions.includes(ed.slug)
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                          : 'border-border hover:border-purple-300'
                      }`}
                    >
                      <Checkbox
                        checked={selectedEditions.includes(ed.slug)}
                        onCheckedChange={() => toggleEdition(ed.slug)}
                        className="rounded-md"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {ed.cover_image_url ? (
                          <Image
                            src={ed.cover_image_url}
                            alt={ed.display_name}
                            width={40}
                            height={53}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-[53px] rounded-lg bg-gradient-to-br from-purple-400 to-pink-400" />
                        )}
                        <span className="font-medium">{ed.display_name}</span>
                      </div>
                    </label>
                  ))}

                  <label
                    className={`flex items-center gap-3 p-3 rounded-[20px] border-2 cursor-pointer transition-all ${
                      noBook
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-border hover:border-purple-300'
                    }`}
                  >
                    <Checkbox
                      checked={noBook}
                      onCheckedChange={() => handleNoBook()}
                      className="rounded-md"
                    />
                    <span className="font-medium text-muted-foreground">I don't have one yet</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 2: Notifications */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30 flex items-center justify-center mb-4">
                    <Bell className="h-7 w-7 text-pink-600 dark:text-pink-400" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-xl font-bold font-display">Stay in the loop</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get notified when people like your pages, comment, or follow you
                  </p>
                </div>

                <div className="py-8">
                  {notificationsEnabled ? (
                    <div className="text-center">
                      <div className="h-12 w-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-medium text-green-600">Notifications enabled!</p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleEnableNotifications}
                      variant="outline"
                      className="w-full h-12 rounded-[20px] border-2"
                    >
                      <Bell className="h-5 w-5 mr-2" strokeWidth={1.75} />
                      Enable notifications
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Follow suggestions */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-xl font-bold font-display">Follow a few colorists</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    See their artwork in your feed
                  </p>
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No suggestions yet. You can find colorists to follow later!
                    </div>
                  ) : (
                    suggestions.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-[20px] bg-muted/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={followedUsers.has(user.id) ? 'outline' : 'default'}
                          onClick={() => handleFollow(user.id)}
                          disabled={followedUsers.has(user.id)}
                          className="rounded-full h-8"
                        >
                          {followedUsers.has(user.id) ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip
            </Button>

            {step === totalSteps - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={isSaving}
                className="rounded-[20px] bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 min-w-[120px]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="rounded-[20px] bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
