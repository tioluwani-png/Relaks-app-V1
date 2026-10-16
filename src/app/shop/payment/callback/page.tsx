'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ShopPaymentCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')
  const paymentRef = reference || trxref

  useEffect(() => {
    if (!paymentRef) return

    const verify = async (ref: string) => {
      try {
        // Extract orderId from reference (format: shop-{orderId}-{timestamp})
        const parts = ref.split('-')
        if (parts.length < 2 || parts[0] !== 'shop') {
          setStatus('failed')
          setMessage('Invalid payment reference format')
          return
        }
        const orderId = parts[1]

        const response = await fetch('/api/shop/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref, orderId }),
        })
        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage('Your order has been placed successfully!')
          setOrderNumber(data.orderNumber)
        } else {
          setStatus('failed')
          setMessage(data.error || 'Payment verification failed')
        }
      } catch {
        setStatus('failed')
        setMessage('Could not verify payment. Please contact support.')
      }
    }

    verify(paymentRef)
  }, [paymentRef])

  // If no reference at all, show failed immediately
  if (!paymentRef && status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-gray-600">No payment reference found</p>
          </div>
          <Button onClick={() => router.push('/shop')} className="w-full rounded-2xl h-12">
            Back to Shop
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
          <p className="text-lg text-gray-700">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'success' ? (
          <>
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
              <p className="text-gray-600">{message}</p>
              {orderNumber && (
                <p className="text-sm text-gray-500 mt-2">
                  Order #{orderNumber}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/shop/orders')}
                className="w-full rounded-2xl h-12 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                View My Orders
              </Button>
              <Button variant="outline" onClick={() => router.push('/shop')} className="w-full rounded-2xl h-12">
                Continue Shopping
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
              <p className="text-gray-600">{message}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push('/shop/cart')} className="w-full rounded-2xl h-12">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/shop')} className="w-full rounded-2xl h-12">
                Back to Shop
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ShopPaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
      </div>
    }>
      <ShopPaymentCallbackContent />
    </Suspense>
  )
}
