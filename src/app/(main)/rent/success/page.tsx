'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, BookOpen, Calendar, MapPin, ArrowRight, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RentalSubscriptionWithDetails } from '@/types/database'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

function SuccessContent() {
  const searchParams = useSearchParams()
  const subscriptionId = searchParams.get('subscription')
  const { width, height } = useWindowSize()

  const [subscription, setSubscription] = useState<RentalSubscriptionWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    async function loadSubscription() {
      if (!subscriptionId) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch('/api/rental/subscriptions')
        if (res.ok) {
          const subscriptions = await res.json()
          const sub = subscriptions.find((s: RentalSubscriptionWithDetails) => s.id === subscriptionId)
          if (sub) {
            setSubscription(sub)
          }
        }
      } catch (error) {
        console.error('Failed to load subscription:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSubscription()

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [subscriptionId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null
  const swapFrequency = subscription?.plan?.swap_frequency

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-24">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          colors={['#A855F7', '#EC4899', '#F97316', '#FBBF24']}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 pt-12 text-center">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="mb-6"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            You&apos;re all set! <PartyPopper className="w-8 h-8 text-orange-500" />
          </h1>
          <p className="text-lg text-gray-600">
            Your books are on their way to you
          </p>
        </motion.div>

        {/* Order details */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-left"
          >
            {/* Plan info */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{subscription.plan?.name} Plan</h2>
                <p className="text-sm text-gray-500">
                  {subscription.plan?.books_per_cycle} books
                </p>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Active
              </div>
            </div>

            {/* Books */}
            <div className="py-4 border-b border-gray-100">
              <p className="text-sm text-gray-500 mb-3">Your books:</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {subscription.books?.map((item) => (
                  <div key={item.id}>
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 mb-1">
                      {item.book?.cover_url ? (
                        <Image
                          src={item.book.cover_url}
                          alt={item.book.title || 'Book'}
                          width={80}
                          height={120}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{item.book?.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery info */}
            <div className="py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Delivery to:</p>
                  <p className="font-medium text-gray-900">
                    {subscription.delivery_address}, {subscription.delivery_lga}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Expected delivery:</p>
                  <p className="font-medium text-gray-900">Within 2-4 days</p>
                </div>
              </div>
            </div>

            {/* Key date */}
            {expiresAt && (
              <div className="pt-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-600">
                    {swapFrequency === 'monthly' ? (
                      <>
                        We&apos;ll come swap your books around{' '}
                        <strong className="text-purple-600">
                          {expiresAt.toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </>
                    ) : (
                      <>
                        These books are yours until{' '}
                        <strong className="text-purple-600">
                          {expiresAt.toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 space-y-3"
        >
          <Link href="/rent/my-rentals">
            <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-semibold">
              View My Rentals
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <Link href="/feed">
            <Button variant="outline" className="w-full h-12 rounded-2xl">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
