'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">!</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We&apos;re sorry, but something unexpected happened. Please try again.
        </p>
        <Button
          onClick={reset}
          className="gradient-purple-pink text-white border-0"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}
