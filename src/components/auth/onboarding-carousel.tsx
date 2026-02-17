'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ChevronRight, ChevronLeft, Share2, Palette, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from '@/components/shared/motion'
import type { Edition } from '@/types/database'

const slides = [
  {
    icon: Share2,
    title: 'Share your art',
    description: 'Upload and share your colored pages with the community. Get likes, comments, and inspire others.',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    icon: Palette,
    title: 'Find inspiration',
    description: 'Browse curated color references for each Relaks edition. No more scattered Pinterest boards.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Heart,
    title: 'Build wellness habits',
    description: 'Track your coloring and journaling streaks. Celebrate milestones and grow mindfully.',
    gradient: 'from-orange-400 to-pink-500',
  },
]

const editions: { value: Edition; label: string; gradient: string }[] = [
  { value: 'lavender', label: 'Lavender Edition', gradient: 'from-purple-500 to-violet-600' },
  { value: 'pink', label: 'Pink Edition', gradient: 'from-pink-500 to-rose-500' },
  { value: 'christmas', label: 'Christmas Edition', gradient: 'from-red-500 to-green-600' },
]

export function OnboardingCarousel() {
  const router = useRouter()
  const supabase = createClient()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [selectedEditions, setSelectedEditions] = useState<Edition[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const isLastSlide = currentSlide === slides.length
  const isProfileSlide = currentSlide === slides.length

  const handleNext = () => {
    if (currentSlide < slides.length) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  const toggleEdition = (edition: Edition) => {
    setSelectedEditions(prev =>
      prev.includes(edition)
        ? prev.filter(e => e !== edition)
        : [...prev, edition]
    )
  }

  const handleComplete = async () => {
    setIsLoading(true)
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
          display_name: displayName || null,
          editions_owned: selectedEditions,
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
      setIsLoading(false)
    }
  }

  return (
    <FadeIn>
      <div className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] overflow-hidden w-full">
        {/* Gradient accent */}
        <div className="h-1.5 gradient-purple-pink" />

        <div className="p-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[...slides, null].map((_, index) => (
              <motion.div
                key={index}
                animate={{
                  width: index === currentSlide ? 32 : 8,
                }}
                className={`h-2 rounded-full transition-colors ${
                  index === currentSlide
                    ? 'gradient-purple-pink'
                    : index < currentSlide
                    ? 'bg-purple-300'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[300px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!isProfileSlide ? (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center space-y-4"
                >
                  <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-r ${slides[currentSlide].gradient} flex items-center justify-center`}>
                    {(() => {
                      const Icon = slides[currentSlide].icon
                      return <Icon className="h-8 w-8 text-white" />
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold">{slides[currentSlide].title}</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                    {slides[currentSlide].description}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Complete your profile</h2>
                    <p className="text-muted-foreground text-sm mt-1">Tell us a bit about yourself</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      placeholder="How should we call you?"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="rounded-xl h-11 focus-visible:ring-purple-500/30"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Do you own any Relaks books?</Label>
                    <div className="grid gap-3">
                      {editions.map(edition => (
                        <label
                          key={edition.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedEditions.includes(edition.value)
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                              : 'border-border hover:border-purple-500/50'
                          }`}
                        >
                          <Checkbox
                            checked={selectedEditions.includes(edition.value)}
                            onCheckedChange={() => toggleEdition(edition.value)}
                          />
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-md bg-gradient-to-r ${edition.gradient}`} />
                            <span className="font-medium">{edition.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can always update this later in settings
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {isLastSlide ? (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="rounded-xl gradient-purple-pink text-white border-0"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get Started
              </Button>
            ) : (
              <Button onClick={handleNext} className="rounded-xl gradient-purple-pink text-white border-0">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </FadeIn>
  )
}
