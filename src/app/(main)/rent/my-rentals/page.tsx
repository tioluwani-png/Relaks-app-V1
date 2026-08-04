'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  Package,
  Truck,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import type { RentalSubscriptionWithDetails, RentalSubscriptionStatus } from '@/types/database'

const STATUS_CONFIG: Record<RentalSubscriptionStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ElementType
}> = {
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  awaiting_return: {
    label: 'Awaiting Return',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: Package,
  },
  completed: {
    label: 'Completed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: RotateCcw,
  },
}

export default function MyRentalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [subscriptions, setSubscriptions] = useState<RentalSubscriptionWithDetails[]>([])
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

  const activeSubscription = subscriptions.find(s => s.status === 'active')
  const pastSubscriptions = subscriptions.filter(s => s.status !== 'active')

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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
            {activeSubscription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-500" />
                  Current Rental
                </h2>
                <SubscriptionCard subscription={activeSubscription} isCurrent />
              </motion.div>
            )}

            {/* Past rentals */}
            {pastSubscriptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Past Rentals</h2>
                <div className="space-y-4">
                  {pastSubscriptions.map((sub, index) => (
                    <SubscriptionCard key={sub.id} subscription={sub} delay={index * 0.05} />
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

function SubscriptionCard({
  subscription,
  isCurrent = false,
  delay = 0,
}: {
  subscription: RentalSubscriptionWithDetails
  isCurrent?: boolean
  delay?: number
}) {
  const statusConfig = STATUS_CONFIG[subscription.status]
  const StatusIcon = statusConfig.icon

  const startedAt = subscription.started_at ? new Date(subscription.started_at) : null
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null

  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'bg-white rounded-3xl p-5 shadow-sm border',
        isCurrent ? 'border-purple-200 ring-1 ring-purple-100' : 'border-gray-100'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{subscription.plan?.name} Plan</h3>
          <p className="text-sm text-gray-500">
            {startedAt?.toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
          <StatusIcon className="w-4 h-4" />
          {statusConfig.label}
        </div>
      </div>

      {/* Books */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 mb-4">
        {subscription.books?.map((item) => (
          <div key={item.id} className="shrink-0 w-12">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100">
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
                  <BookOpen className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          {subscription.delivery_lga}
        </div>

        {isCurrent && daysRemaining !== null && (
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            {daysRemaining === 0 ? (
              <span className="text-orange-600 font-medium">Due today</span>
            ) : daysRemaining === 1 ? (
              <span className="text-orange-600 font-medium">1 day remaining</span>
            ) : (
              <span>{daysRemaining} days remaining</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
