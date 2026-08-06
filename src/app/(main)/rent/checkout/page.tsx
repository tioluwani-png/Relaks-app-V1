'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Loader2, MapPin, Phone, Home, CreditCard, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import type { RentalPlan } from '@/types/database'

// Book type from the books table (via /api/rental/books)
interface RentalBook {
  id: string
  title: string
  author: string
  cover_url: string | null
  genre?: string | null
}

// Lagos LGAs
const LAGOS_LGAS = [
  'Agege',
  'Ajeromi-Ifelodun',
  'Alimosho',
  'Amuwo-Odofin',
  'Apapa',
  'Badagry',
  'Epe',
  'Eti-Osa',
  'Ibeju-Lekki',
  'Ifako-Ijaiye',
  'Ikeja',
  'Ikorodu',
  'Kosofe',
  'Lagos Island',
  'Lagos Mainland',
  'Mushin',
  'Ojo',
  'Oshodi-Isolo',
  'Shomolu',
  'Surulere',
]

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()

  const planId = searchParams.get('plan')
  const bookIdsParam = searchParams.get('books')

  const [plan, setPlan] = useState<RentalPlan | null>(null)
  const [selectedBooks, setSelectedBooks] = useState<RentalBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [deliveryLga, setDeliveryLga] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = `/rent/checkout?${searchParams.toString()}`
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)
    }
  }, [user, authLoading, router, searchParams])

  // Redirect if missing params
  useEffect(() => {
    if (!planId || !bookIdsParam) {
      router.replace('/rent')
    }
  }, [planId, bookIdsParam, router])

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!planId || !bookIdsParam) return

      try {
        // Load plan
        const plansRes = await fetch('/api/rental/plans')
        if (plansRes.ok) {
          const plans = await plansRes.json()
          const currentPlan = plans.find((p: RentalPlan) => p.id === planId)
          if (currentPlan) {
            setPlan(currentPlan)
          } else {
            router.replace('/rent')
            return
          }
        }

        // Load selected books
        const booksRes = await fetch('/api/rental/books')
        if (booksRes.ok) {
          const allBooks: RentalBook[] = await booksRes.json()
          const bookIds = bookIdsParam.split(',')
          const selected = allBooks.filter(b => bookIds.includes(b.id))
          setSelectedBooks(selected)

          // Validate book count
          const currentPlanRes = await fetch('/api/rental/plans')
          if (currentPlanRes.ok) {
            const plans = await currentPlanRes.json()
            const thePlan = plans.find((p: RentalPlan) => p.id === planId)
            if (thePlan && selected.length !== thePlan.books_per_cycle) {
              toast.error('Please select the correct number of books')
              router.replace(`/books?plan=${planId}`)
              return
            }
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load checkout data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [planId, bookIdsParam, router])

  const validatePhone = (phone: string): boolean => {
    // Nigerian phone format: 080..., 081..., 090..., 091..., +234...
    const cleaned = phone.replace(/\s/g, '')
    return /^(\+234|0)[789][01]\d{8}$/.test(cleaned)
  }

  const handlePayment = async () => {
    // Validate form
    if (!deliveryLga) {
      toast.error('Please select your LGA')
      return
    }
    if (!deliveryAddress || deliveryAddress.length < 5) {
      toast.error('Please enter a valid address')
      return
    }
    if (!deliveryPhone || !validatePhone(deliveryPhone)) {
      toast.error('Please enter a valid Nigerian phone number')
      return
    }

    if (!plan || !user) return

    setIsSubmitting(true)

    try {
      // 1. Create order via API
      const createRes = await fetch('/api/rental/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          bookIds: selectedBooks.map(b => b.id),
          deliveryLga,
          deliveryAddress,
          deliveryPhone,
          termsAccepted: true, // Already validated by button disabled state
        }),
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create order')
      }

      const { subscriptionId, planPrice } = createData

      // 2. Generate reference
      const reference = `rental_${subscriptionId}_${Date.now()}`

      // 3. Load Paystack inline
      const PaystackPop = (window as unknown as { PaystackPop?: { setup: (config: PaystackConfig) => PaystackHandler } }).PaystackPop
      if (!PaystackPop) {
        throw new Error('Payment system not loaded. Please refresh the page.')
      }

      interface PaystackConfig {
        key: string
        email: string
        amount: number
        ref: string
        currency: string
        metadata: {
          custom_fields: { display_name: string; variable_name: string; value: string }[]
          user_id: string
          subscription_id: string
          type: string
        }
        callback: (response: { reference: string }) => void
        onClose: () => void
      }

      interface PaystackHandler {
        openIframe: () => void
      }

      const handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: user.email!,
        amount: planPrice * 100, // kobo
        ref: reference,
        currency: 'NGN',
        metadata: {
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan', value: plan.name },
          ],
          user_id: user.id,
          subscription_id: subscriptionId,
          type: 'rental',
        },
        callback: async (response: { reference: string }) => {
          // Verify payment
          try {
            const verifyRes = await fetch('/api/rental/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reference: response.reference,
                subscriptionId,
              }),
            })

            if (verifyRes.ok) {
              router.push(`/rent/success?subscription=${subscriptionId}`)
            } else {
              const verifyData = await verifyRes.json()
              toast.error(verifyData.error || 'Payment verification failed')
              setIsSubmitting(false)
            }
          } catch (err) {
            console.error('Verify error:', err)
            toast.error('Payment verification failed. Contact support if payment was deducted.')
            setIsSubmitting(false)
          }
        },
        onClose: () => {
          // Reset loading state when payment popup is closed
          setIsSubmitting(false)
          toast.error('Payment cancelled')
        },
      } as PaystackConfig)

      handler.openIframe()
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed')
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!plan || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-8">
      {/* Paystack script */}
      <script src="https://js.paystack.co/v1/inline.js" async />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/books?plan=${planId}&books=${bookIdsParam}`}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

          {/* Plan */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">{plan.name} Plan</p>
              <p className="text-sm text-gray-500">
                {plan.books_per_cycle} books, {plan.duration_days} days
              </p>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {plan.price_naira.toLocaleString()} NGN
            </p>
          </div>

          {/* Books */}
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-3">Your books:</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
              {selectedBooks.map(book => (
                <div key={book.id} className="shrink-0 w-16">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 mb-1">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        width={64}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{book.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <p className="font-semibold text-gray-900">Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {plan.price_naira.toLocaleString()} NGN
            </p>
          </div>

          <p className="text-sm text-green-600 mt-2 text-right">
            Delivery included
          </p>
        </motion.div>

        {/* Delivery Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            Delivery Details
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="lga" className="text-gray-700">
                Local Government Area (LGA)
              </Label>
              <Select value={deliveryLga} onValueChange={setDeliveryLga}>
                <SelectTrigger className="h-12 rounded-xl mt-1.5">
                  <SelectValue placeholder="Select your LGA" />
                </SelectTrigger>
                <SelectContent>
                  {LAGOS_LGAS.map(lga => (
                    <SelectItem key={lga} value={lga}>
                      {lga}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address" className="text-gray-700">
                <Home className="w-4 h-4 inline mr-1" />
                Street Address
              </Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your full street address"
                className="h-12 rounded-xl mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                placeholder="080XXXXXXXX"
                className="h-12 rounded-xl mt-1.5"
              />
            </div>
          </div>
        </motion.div>

        {/* Terms Consent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="h-5 w-5"
              />
            </div>
            <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                <FileText className="w-4 h-4 text-purple-500" />
                I agree to the Reading Club terms
              </span>
              I&apos;ll take care of the books and return them at the end of my cycle.{' '}
              <Link
                href="/rent/terms"
                target="_blank"
                className="text-purple-600 hover:text-purple-700 underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Read the full terms
              </Link>
            </label>
          </div>
        </motion.div>

        {/* Pay Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handlePayment}
            disabled={isSubmitting || !termsAccepted}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pay {plan.price_naira.toLocaleString()} NGN
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-3">
            Secure payment powered by Paystack
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
