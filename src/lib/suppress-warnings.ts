// Suppress known Supabase development warnings
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  console.error = (...args) => {
    // Suppress "signal is aborted without reason" warning from Supabase
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

export {}
