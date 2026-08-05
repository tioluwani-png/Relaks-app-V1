'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  Loader2,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

import { StatusTracker } from '@/components/rental/status-tracker'
import { CountdownRing } from '@/components/rental/countdown-ring'
import { BookRating } from '@/components/rental/book-rating'
import { AutoRenewToggle } from '@/components/rental/auto-renew-toggle'
import { RenewButton } from '@/components/rental/renew-button'

import type { RentalSubscriptionStatus } from '@/types/database'

interface SubscriptionBook {
  id: string
  book_id: string
  returned: boolean
  book: {
    id: string
    title: string
    author: string
    cover_url: string | null
  } | null
}

interface BookRatingData {
  book_id: string
  rating: number
  review: string | null
}

interface Subscription {
  id: string
  status: RentalSubscriptionStatus
  created_at: string
  started_at: string | null
  expires_at: string | null
  delivery_lga: string
  delivery_address: string
  picked_up_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  auto_renew: boolean
  plan: {
    id: string
    name: string
    books_per_cycle: number
    duration_days: number
    price_naira: number
  } | null
  books: SubscriptionBook[]
  ratings?: BookRatingData[]
}

const ACTIVE_STATUSES: RentalSubscriptionStatus[] = [
  'active',
  'processing',
  'picked_up',
  'in_transit',
  'delivered',
]

export default function MyRentalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/rent/my-rentals')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const res = await fetch('/api/rental/subscriptions')
        if (res.ok) {
          const data = await res.json()
          setSubscriptions(data)
        }
      } catch (error) {
        console.error('Failed to load subscriptions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadSubscriptions()
    }
  }, [user])

  const currentSubscription = subscriptions.find(s => ACTIVE_STATUSES.includes(s.status))
  const pastSubscriptions = subscriptions.filter(s => !ACTIVE_STATUSES.includes(s.status))

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/rent" className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">My Rentals</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {subscriptions.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No rentals yet</h2>
            <p className="text-gray-500 mb-6">
              Start your reading journey with our book club
            </p>
            <Link href="/rent">
              <Button className="rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-semibold">
                Browse Plans
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Current rental */}
            {currentSubscription && (
              <CurrentRentalSection subscription={currentSubscription} />
            )}

            {/* Past rentals */}
            {pastSubscriptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Rentals</h2>
                <div className="space-y-4">
                  {pastSubscriptions.map((sub, index) => (
                    <PastRentalCard key={sub.id} subscription={sub} delay={index * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CurrentRentalSection({ subscription }: { subscription: Subscription }) {
  const [ratings, setRatings] = useState<Record<string, BookRatingData>>({})

  useEffect(() => {
    async function loadRatings() {
      try {
        const res = await fetch(`/api/rental/ratings?subscriptionId=${subscription.id}`)
        if (res.ok) {
          const data = await res.json()
          const ratingsMap: Record<string, BookRatingData> = {}
          for (const r of data.ratings || []) {
            ratingsMap[r.book_id] = r
          }
          setRatings(ratingsMap)
        }
      } catch (error) {
        console.error('Failed to load ratings:', error)
      }
    }

    if (subscription.delivered_at) {
      loadRatings()
    }
  }, [subscription.id, subscription.delivered_at])

  const isDelivered = subscription.status === 'delivered' || subscription.status === 'awaiting_return'

  // Check if can rate (3 days after delivery)
  const canRate = subscription.delivered_at
    ? differenceInDays(new Date(), new Date(subscription.delivered_at)) >= 3
    : false

  // Check if should show renew button (last 7 days, auto_renew off)
  const showRenewButton = isDelivered &&
    subscription.expires_at &&
    !subscription.auto_renew &&
    differenceInDays(new Date(subscription.expires_at), new Date()) <= 7

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-lg font-semibold text-gray-900">Current Rental</h2>

      {/* Status Tracker Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{subscription.plan?.name} Plan</h3>
            <p className="text-sm text-gray-500">{subscription.delivery_lga}</p>
          </div>
        </div>

        <StatusTracker
          currentStatus={subscription.status}
          pickedUpAt={subscription.picked_up_at}
          inTransitAt={subscription.in_transit_at}
          deliveredAt={subscription.delivered_at}
          className="mt-4"
        />
      </div>

      {/* Countdown + Books - only show when delivered */}
      {isDelivered && subscription.delivered_at && subscription.expires_at && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CountdownRing
              deliveredAt={subscription.delivered_at}
              expiresAt={subscription.expires_at}
            />

            <div className="flex-1 w-full">
              <h4 className="font-medium text-gray-900 mb-3">Your Books</h4>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {subscription.books?.map((item) => (
                  <div key={item.id} className="shrink-0 w-14">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100">
                      {item.book?.cover_url ? (
                        <Image
                          src={item.book.cover_url}
                          alt={item.book.title || 'Book'}
                          width={56}
                          height={84}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Ratings - only show when delivered */}
      {isDelivered && subscription.books?.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 px-1">Rate Your Books</h4>
          {subscription.books.map((item) => (
            item.book && (
              <BookRating
                key={item.id}
                subscriptionId={subscription.id}
                book={item.book}
                existingRating={ratings[item.book.id] || null}
                canRate={canRate}
              />
            )
          ))}
        </div>
      )}

      {/* Auto-renew toggle */}
      {isDelivered && subscription.plan && (
        <AutoRenewToggle
          subscriptionId={subscription.id}
          enabled={subscription.auto_renew}
          planPrice={subscription.plan.price_naira}
        />
      )}

      {/* Manual renew button */}
      {showRenewButton && subscription.plan && (
        <RenewButton
          planId={subscription.plan.id}
          booksPerCycle={subscription.plan.books_per_cycle}
        />
      )}
    </motion.div>
  )
}

function PastRentalCard({
  subscription,
  delay = 0,
}: {
  subscription: Subscription
  delay?: number
}) {
  const startedAt = subscription.started_at ? new Date(subscription.started_at) : null

  const statusLabel = subscription.status === 'completed'
    ? 'Completed'
    : subscription.status === 'cancelled'
      ? 'Cancelled'
      : subscription.status === 'awaiting_return'
        ? 'Awaiting Return'
        : 'Past'

  const statusColor = subscription.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : subscription.status === 'cancelled'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-700'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{subscription.plan?.name} Plan</h3>
          <p className="text-xs text-gray-500">
            {startedAt?.toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* Books with ratings */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {subscription.books?.map((item) => {
          const rating = subscription.ratings?.find(r => r.book_id === item.book_id)

          return (
            <div key={item.id} className="shrink-0 w-12 text-center">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 mb-1">
                {item.book?.cover_url ? (
                  <Image
                    src={item.book.cover_url}
                    alt={item.book.title || 'Book'}
                    width={48}
                    height={72}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-3 h-3 text-gray-300" />
                  </div>
                )}
              </div>
              {rating && (
                <div className="flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-600">{rating.rating}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
        <MapPin className="w-3 h-3" />
        {subscription.delivery_lga}
      </div>
    </motion.div>
  )
}
