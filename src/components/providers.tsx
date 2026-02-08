'use client'

import { useEffect } from 'react'

// Suppress known development warnings
function suppressWarnings() {
  if (typeof window !== 'undefined') {
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      if (
        args[0] &&
        typeof args[0] === 'string' &&
        args[0].includes('signal is aborted without reason')
      ) {
        return
      }
      originalConsoleError.apply(console, args)
    }
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    suppressWarnings()
  }, [])

  return <>{children}</>
}
