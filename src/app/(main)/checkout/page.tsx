'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Loader2,
  MapPin,
  Truck,
  CreditCard,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FadeIn } from '@/components/shared/motion'
import {
  useCartStore,
  formatPrice,
  BOOK_RENTAL_PRICE,
  LAGOS_DELIVERY_FEE,
} from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

type CheckoutStep = 'cart' | 'delivery' | 'payment'

interface DeliveryForm {
  full_name: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  landmark: string
  delivery_notes: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const profile = useAuthStore((state) => state.profile)
  const {
    items,
    isLoading,
    isInitialized,
    fetchCart,
    removeFromCart,
    getSubtotal,
    getDeliveryFee,
    getTotal,
  } = useCartStore()

  const [step, setStep] = useState<CheckoutStep>('cart')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    full_name: profile?.display_name || '',
    phone: '',
    email: profile?.email || '',
    address: '',
    city: 'Lagos',
    state: 'Lagos',
    landmark: '',
    delivery_notes: '',
  })

  // Fetch cart on mount
  useEffect(() => {
    if (!isInitialized) {
      fetchCart()
    }
  }, [fetchCart, isInitialized])

  // Update form with profile data when available
  useEffect(() => {
    if (profile) {
      setDeliveryForm((prev) => ({
        ...prev,
        full_name: prev.full_name || profile.display_name || '',
        email: prev.email || profile.email || '',
      }))
    }
  }, [profile])

  const handleRemoveItem = async (bookId: string) => {
    await removeFromCart(bookId)
    toast.success('Item removed from cart')
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setDeliveryForm((prev) => ({ ...prev, [name]: value }))
  }

  const validateDeliveryForm = (): boolean => {
    if (!deliveryForm.full_name.trim()) {
      toast.error('Please enter your full name')
      return false
    }
    if (!deliveryForm.phone.trim()) {
      toast.error('Please enter your phone number')
      return false
    }
    if (!deliveryForm.email.trim()) {
      toast.error('Please enter your email address')
      return false
    }
    if (!deliveryForm.address.trim()) {
      toast.error('Please enter your delivery address')
      return false
    }
    return true
  }

  const handleProceedToDelivery = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    setStep('delivery')
  }

  const handleProceedToPayment = async () => {
    if (!validateDeliveryForm()) return

    setIsSubmitting(true)

    try {
      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery: deliveryForm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      // Initialize payment
      const payResponse = await fetch(`/api/orders/${data.order.id}/pay`, {
        method: 'POST',
      })

      const payData = await payResponse.json()

      if (!payResponse.ok) {
        throw new Error(payData.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack
      window.location.href = payData.authorization_url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (step === 'delivery') {
                  setStep('cart')
                } else {
                  router.back()
                }
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {step === 'cart' && 'Your Cart'}
                {step === 'delivery' && 'Delivery Details'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'cart' && `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                {step === 'delivery' && 'Enter your delivery information'}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === 'cart'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </div>
            <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === 'delivery'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              <Truck className="h-4 w-4" />
              Delivery
            </div>
            <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
              <CreditCard className="h-4 w-4" />
              Pay
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {step === 'cart' && (
          <FadeIn className="space-y-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                  Browse our book collection and add some books to rent
                </p>
                <Link href="/books">
                  <Button className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Books
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm"
                    >
                      {/* Book Cover */}
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0">
                        {item.book?.cover_url ? (
                          <Image
                            src={item.book.cover_url}
                            alt={item.book?.title || 'Book'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                            <span className="text-2xl font-bold text-purple-300">
                              {item.book?.title?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {item.book?.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.book?.author}
                        </p>
                        <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-2">
                          {formatPrice(BOOK_RENTAL_PRICE)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.book_id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Order Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Subtotal ({items.length} {items.length === 1 ? 'book' : 'books'})
                      </span>
                      <span className="font-medium">{formatPrice(getSubtotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Delivery (Lagos)
                      </span>
                      <span className="font-medium">{formatPrice(getDeliveryFee())}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="text-purple-600 dark:text-purple-400">
                          {formatPrice(getTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed Button */}
                <Button
                  onClick={handleProceedToDelivery}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  Proceed to Delivery
                </Button>
              </>
            )}
          </FadeIn>
        )}

        {step === 'delivery' && (
          <FadeIn className="space-y-6">
            {/* Delivery Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={deliveryForm.full_name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={deliveryForm.phone}
                    onChange={handleInputChange}
                    placeholder="08012345678"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={deliveryForm.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={deliveryForm.address}
                  onChange={handleInputChange}
                  placeholder="Enter your full delivery address"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={deliveryForm.city}
                    onChange={handleInputChange}
                    placeholder="Lagos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={deliveryForm.state}
                    onChange={handleInputChange}
                    placeholder="Lagos"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  name="landmark"
                  value={deliveryForm.landmark}
                  onChange={handleInputChange}
                  placeholder="Near a well-known place"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_notes">Delivery Notes (Optional)</Label>
                <Textarea
                  id="delivery_notes"
                  name="delivery_notes"
                  value={deliveryForm.delivery_notes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for delivery"
                  rows={2}
                />
              </div>
            </div>

            {/* Order Summary (Compact) */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {items.length} {items.length === 1 ? 'book' : 'books'} + Delivery
                  </p>
                  <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {formatPrice(getTotal())}
                  </p>
                </div>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  )
}
