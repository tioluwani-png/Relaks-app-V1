'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function PaymentCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')

  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')

  useEffect(() => {
    if (reference || trxref) {
      verifyPayment(reference || trxref || '')
    } else {
      setStatus('failed')
      setMessage('No payment reference found')
    }
  }, [reference, trxref])

  const verifyPayment = async (ref: string) => {
    try {
      const response = await fetch(`/api/payments/verify?reference=${ref}`)
      const data = await response.json()

      if (response.ok && data.status === 'success') {
        setStatus('success')
        setMessage('Your payment was successful!')
      } else {
        setStatus('failed')
        setMessage(data.message || 'Payment verification failed')
      }
    } catch {
      setStatus('failed')
      setMessage('Could not verify payment. Please contact support.')
    }
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
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push('/profile/downloads')} className="w-full">
                View My Downloads
              </Button>
              <Button variant="outline" onClick={() => router.push('/discover/pages')} className="w-full">
                Continue Browsing
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
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push('/discover/pages')} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/feed')} className="w-full">
                Go Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  )
}
