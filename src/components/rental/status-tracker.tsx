'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RentalSubscriptionStatus } from '@/types/database'

interface StatusStep {
  status: RentalSubscriptionStatus | 'paid'
  label: string
  description: string
}

const STEPS: StatusStep[] = [
  { status: 'paid', label: 'Paid', description: 'Order confirmed' },
  { status: 'processing', label: 'Processing', description: 'Preparing your books' },
  { status: 'picked_up', label: 'Picked Up', description: 'Books ready for delivery' },
  { status: 'in_transit', label: 'In Transit', description: 'On the way to you' },
  { status: 'delivered', label: 'Delivered', description: 'Enjoy your books!' },
]

// Map status to step index
const STATUS_INDEX: Record<string, number> = {
  active: 0,
  processing: 1,
  picked_up: 2,
  in_transit: 3,
  delivered: 4,
  awaiting_return: 4,
  completed: 4,
}

interface StatusTrackerProps {
  currentStatus: RentalSubscriptionStatus
  pickedUpAt?: string | null
  inTransitAt?: string | null
  deliveredAt?: string | null
  className?: string
}

export function StatusTracker({
  currentStatus,
  pickedUpAt,
  inTransitAt,
  deliveredAt,
  className,
}: StatusTrackerProps) {
  const currentIndex = STATUS_INDEX[currentStatus] ?? 0

  // Determine if in_transit step should show (only if in_transit_at exists)
  const showInTransit = Boolean(inTransitAt)

  // Filter steps based on whether in_transit was used
  const visibleSteps = showInTransit
    ? STEPS
    : STEPS.filter(s => s.status !== 'in_transit')

  // Recalculate current index for visible steps
  const getVisibleIndex = (status: string) => {
    if (status === 'active') return 0
    if (status === 'processing') return 1
    if (status === 'picked_up') return 2
    if (status === 'in_transit') return showInTransit ? 3 : 2
    if (['delivered', 'awaiting_return', 'completed'].includes(status)) {
      return showInTransit ? 4 : 3
    }
    return 0
  }

  const visibleCurrentIndex = getVisibleIndex(currentStatus)

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal stepper */}
      <div className="hidden sm:flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isCompleted = index < visibleCurrentIndex
          const isCurrent = index === visibleCurrentIndex
          const isPending = index > visibleCurrentIndex

          return (
            <div key={step.status} className="flex-1 flex items-center">
              <div className="flex flex-col items-center w-full">
                {/* Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-purple-500 text-white ring-4 ring-purple-100',
                    isPending && 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <p
                  className={cn(
                    'mt-2 text-sm font-medium text-center',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-purple-600',
                    isPending && 'text-gray-400'
                  )}
                >
                  {step.label}
                </p>

                {/* Description */}
                <p className="text-xs text-gray-400 text-center mt-0.5">
                  {step.description}
                </p>
              </div>

              {/* Connector line */}
              {index < visibleSteps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded-full',
                    index < visibleCurrentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: Vertical stepper */}
      <div className="sm:hidden space-y-4">
        {visibleSteps.map((step, index) => {
          const isCompleted = index < visibleCurrentIndex
          const isCurrent = index === visibleCurrentIndex
          const isPending = index > visibleCurrentIndex

          return (
            <div key={step.status} className="flex items-start gap-3">
              {/* Circle and connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-purple-500 text-white',
                    isPending && 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                {index < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-8 mt-1',
                      index < visibleCurrentIndex
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-purple-600',
                    isPending && 'text-gray-400'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
