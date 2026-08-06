'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, MapPin, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCart } from '@/lib/shop/cart-context'
import { createClient } from '@/lib/supabase/client'
import { LAGOS_LGAS } from '@/lib/shop/config'
import type { ShopDeliveryZone } from '@/types/database'

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string
        email: string
        amount: number
        currency: string
        ref: string
        metadata: Record<string, unknown>
        callback: (response: { reference: string }) => void
        onClose: () => void
      }) => { openIframe: () => void }
    }
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const supabase = createClient()

  const [zones, setZones] = useState<ShopDeliveryZone[]>([])
  const [isLoadingZones, setIsLoadingZones] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryLga, setDeliveryLga] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')

  // Computed
  const selectedZone = zones.find((z) => z.lgas.includes(deliveryLga))
  const deliveryFee = selectedZone?.fee_naira || 0
  const total = subtotal + deliveryFee

  // Load zones and prefill user info
  useEffect(() => {
    loadZones()
    prefillUserInfo()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadZones = async () => {
    setIsLoadingZones(true)
    try {
      const res = await fetch('/api/shop/zones')
      if (!res.ok) throw new Error('Failed to load zones')
      const data = await res.json()
      setZones(data)
    } catch (error) {
      console.error('Failed to load zones:', error)
      toast.error('Failed to load delivery zones')
    } finally {
      setIsLoadingZones(false)
    }
  }

  const prefillUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')

      // Get username from users table
      const { data: profile } = await supabase
        .from('users')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

      if (profile) {
        const p = profile as { display_name: string | null; username: string }
        setCustomerName(p.display_name || p.username || '')
      }
    }
  }

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace('/shop')
    }
  }, [items.length, router])

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      toast.error('Please enter your name')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return false
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number')
      return false
    }
    if (!deliveryLga) {
      toast.error('Please select your LGA')
      return false
    }
    if (!deliveryAddress.trim() || deliveryAddress.length < 10) {
      toast.error('Please enter your full delivery address')
      return false
    }
    if (!selectedZone) {
      toast.error('Delivery not available for selected LGA')
      return false
    }
    return true
  }

  const handlePayment = useCallback(async () => {
    if (!validateForm()) return
    if (!window.PaystackPop) {
      toast.error('Payment system loading, please wait...')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Create order via API (server validates cart and computes totals)
      const createRes = await fetch('/api/shop/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          customerName: customerName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          deliveryLga,
          deliveryAddress: deliveryAddress.trim(),
        }),
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create order')
      }

      const { orderId, orderNumber, total: serverTotal } = createData

      // 2. Initialize Paystack
      const reference = `shop_${orderId}_${Date.now()}`

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: email.trim().toLowerCase(),
        amount: serverTotal * 100, // kobo
        currency: 'NGN',
        ref: reference,
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          type: 'shop',
        },
        callback: async (response) => {
          // 3. Verify payment
          try {
            const verifyRes = await fetch('/api/shop/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reference: response.reference,
                orderId,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            // Success!
            clearCart()
            router.push(`/shop/success?order=${orderNumber}`)
          } catch (error) {
            console.error('Payment verification error:', error)
            toast.error('Payment verification failed. Please contact support.')
            setIsSubmitting(false)
          }
        },
        onClose: () => {
          setIsSubmitting(false)
          toast('Payment cancelled')
        },
      })

      handler.openIframe()
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Checkout failed')
      setIsSubmitting(false)
    }
  }, [items, customerName, email, phone, deliveryLga, deliveryAddress, selectedZone, clearCart, router])

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/shop/cart"
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
          className="bg-white rounded-3xl p-6 border border-gray-100"
        >
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden relative shrink-0">
                  {item.product.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                  <p className="text-gray-500 text-sm">×{item.quantity}</p>
                </div>
                <p className="text-gray-900 font-medium">
                  ₦{(item.product.price_naira * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Delivery
              </span>
              <span>
                {deliveryLga ? (
                  `₦${deliveryFee.toLocaleString()}`
                ) : (
                  <span className="text-gray-400">Select LGA</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Contact Information</h2>

          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                className="mt-1 h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                className="mt-1 h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </motion.div>

        {/* Delivery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Delivery</h2>

          {isLoadingZones ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>LGA (Lagos only)</Label>
                <Select
                  value={deliveryLga}
                  onValueChange={setDeliveryLga}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="mt-1 h-12 rounded-xl">
                    <SelectValue placeholder="Select your LGA" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAGOS_LGAS.map((lga) => {
                      const zone = zones.find((z) => z.lgas.includes(lga))
                      return (
                        <SelectItem key={lga} value={lga}>
                          {lga}
                          {zone && (
                            <span className="text-gray-500 ml-2">
                              — ₦{zone.fee_naira.toLocaleString()}
                            </span>
                          )}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedZone && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl text-purple-700 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selectedZone.name} — ₦{selectedZone.fee_naira.toLocaleString()} delivery
                  </span>
                </div>
              )}

              <div>
                <Label>Delivery Address</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full address with landmark"
                  className="mt-1 h-12 rounded-xl"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Lagos only note */}
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            We currently only deliver within Lagos. For other locations, please{' '}
            <Link href="/shop" className="underline hover:no-underline">
              contact our distributors
            </Link>
            .
          </p>
        </div>

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            `Pay ₦${total.toLocaleString()}`
          )}
        </Button>
      </div>
    </div>
  )
}
