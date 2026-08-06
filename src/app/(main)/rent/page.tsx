'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BookOpen, Truck, RefreshCw, ArrowRight, Loader2, MapPin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RentalPlan } from '@/types/database'

export default function RentPage() {
  const [plans, setPlans] = useState<RentalPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/rental/plans')
        if (!res.ok) {
          throw new Error('Failed to load plans')
        }
        const data = await res.json()
        if (!data || data.length === 0) {
          setError('No plans available. Please check back later.')
        } else {
          setPlans(data)
        }
      } catch (err) {
        console.error('Failed to load plans:', err)
        setError('Unable to load plans. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }
    loadPlans()
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10" />
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Relaks Book Club
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Curl up with beautiful books delivered to your door. Read at your pace,
              swap when you&apos;re ready. No late fees, no stress.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">Curated Books</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
                <Truck className="w-6 h-6 text-pink-600" />
              </div>
              <span className="text-sm text-gray-600">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-gray-600">Easy Swaps</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center text-gray-900 mb-8"
        >
          Choose Your Plan
        </motion.h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              >
                <div className="relative bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                  {/* Popular badge for quarterly */}
                  {plan.name === 'Quarterly' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                        Best Value
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {plan.description}
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price_naira.toLocaleString()}
                      </span>
                      <span className="text-gray-500">NGN</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.swap_frequency === 'monthly' ? 'per month' : 'for 3 months'}
                      , delivery included
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <BookOpen className="w-5 h-5 text-purple-500 shrink-0" />
                      <span>
                        <strong>{plan.books_per_cycle} books</strong>
                        {plan.swap_frequency === 'monthly'
                          ? ' delivered & swapped monthly'
                          : ' delivered at once'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Truck className="w-5 h-5 text-pink-500 shrink-0" />
                      <span>
                        {plan.swap_frequency === 'monthly'
                          ? 'Monthly rider visits'
                          : 'Two rider visits total'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <RefreshCw className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>
                        {plan.swap_frequency === 'monthly'
                          ? 'Swap for new books each month'
                          : 'One pickup at end of 3 months'}
                      </span>
                    </div>
                  </div>

                  <Link href={`/books?plan=${plan.id}`}>
                    <Button
                      className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 transition-opacity"
                    >
                      Choose {plan.name}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lagos only notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full text-orange-700 text-sm">
            <MapPin className="w-4 h-4" />
            Lagos only for now
          </div>
        </motion.div>

        {/* Footer with terms link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center"
        >
          <Link
            href="/rent/terms"
            className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
          >
            Reading Club Terms
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
