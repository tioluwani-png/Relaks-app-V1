'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Package, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ShopSuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>

        {orderNumber && (
          <p className="text-gray-600 mb-6">
            Order <span className="font-semibold text-gray-900">#{orderNumber}</span>
          </p>
        )}

        <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-6 text-left space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">We&apos;re getting your order ready</p>
              <p className="text-sm text-gray-500">
                You&apos;ll receive a confirmation email shortly with your order details.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-4">
            <p className="text-gray-700 text-sm">
              📱 <strong>We&apos;ll text you</strong> when your order is on the way. Please keep your phone handy!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/shop">
            <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90">
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full h-12 rounded-2xl">
              Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function ShopSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ShopSuccessContent />
    </Suspense>
  )
}
