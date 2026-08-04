'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Legacy rental payment callback page
 * This handles old cart-based rental payments
 * New flow uses /rent/checkout which handles verification inline
 */
function RentalCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')
  const paymentRef = reference || trxref

  useEffect(() => {
    // Redirect to the new rental flow
    // Old cart-based orders are no longer supported
    if (paymentRef) {
      // Try to extract subscription ID from reference (format: rental_{subscriptionId}_{timestamp})
      const match = paymentRef.match(/^rental_([a-f0-9-]+)_/)
      if (match) {
        router.replace(`/rent/success?subscription=${match[1]}`)
        return
      }
    }
    // Fallback to my-rentals
    router.replace('/rent/my-rentals')
  }, [paymentRef, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-lg">Redirecting...</p>
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
