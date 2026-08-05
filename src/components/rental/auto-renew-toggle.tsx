'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AutoRenewToggleProps {
  subscriptionId: string
  enabled: boolean
  planPrice: number
  className?: string
}

export function AutoRenewToggle({
  subscriptionId,
  enabled,
  planPrice,
  className,
}: AutoRenewToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async (newValue: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rental/subscriptions/${subscriptionId}/auto-renew`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: newValue }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update auto-renew')
      }

      setIsEnabled(newValue)
      toast.success(
        newValue
          ? 'Auto-renew enabled! Your card will be charged when your rental ends.'
          : 'Auto-renew disabled.'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-500" />
            <p className="font-medium text-gray-900 dark:text-white">
              Auto-renew
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEnabled ? (
              <>
                We'll charge your saved card{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  ₦{planPrice.toLocaleString()}
                </span>{' '}
                when your cycle ends and bring your next books.
              </>
            ) : (
              'Turn on to keep the books flowing automatically.'
            )}
          </p>
        </div>

        <div className="shrink-0 pt-1">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-purple-500"
            />
          )}
        </div>
      </div>

      {isEnabled && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          You can turn this off anytime before your rental ends.
        </p>
      )}
    </div>
  )
}
