'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'

function RentalCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart } = useCartStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')
  const paymentRef = reference || trxref

  useEffect(() => {
    if (!paymentRef) return

    const verify = async (ref: string) => {
      try {
        const response = await fetch(`/api/payments/rental/verify?reference=${ref}`)
        const data = await response.json()

        if (response.ok && data.status === 'success') {
          setStatus('success')
          setMessage('Your rental order has been placed successfully!')
          setOrderId(data.order_id)
          // Clear the cart after successful payment
          await clearCart()
        } else {
          setStatus('failed')
          setMessage(data.message || 'Payment verification failed')
        }
      } catch {
        setStatus('failed')
        setMessage('Could not verify payment. Please contact support.')
      }
    }

    verify(paymentRef)
  }, [paymentRef, clearCart])

  // If no reference at all, show failed immediately
  if (!paymentRef && status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-muted-foreground">No payment reference found</p>
          </div>
          <Button onClick={() => router.push('/checkout')} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'success' ? (
          <>
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Order Placed!</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Package className="h-4 w-4" />
                <span>Your books will be delivered within 2-3 business days</span>
              </div>
            </div>
            <div className="space-y-3">
              {orderId && (
                <Button onClick={() => router.push(`/orders/${orderId}`)} className="w-full">
                  View Order Details
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/orders')} className="w-full">
                View All Orders
              </Button>
              <Button variant="ghost" onClick={() => router.push('/books')} className="w-full">
                Continue Browsing
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push('/checkout')} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/books')} className="w-full">
                Browse Books
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function RentalCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <RentalCallbackContent />
    </Suspense>
  )
}
