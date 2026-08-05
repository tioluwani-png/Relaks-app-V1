'use client'

import { differenceInDays, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface CountdownRingProps {
  deliveredAt: string
  expiresAt: string
  className?: string
}

export function CountdownRing({ deliveredAt, expiresAt, className }: CountdownRingProps) {
  const deliveryDate = new Date(deliveredAt)
  const expiryDate = new Date(expiresAt)
  const now = new Date()

  const totalDays = differenceInDays(expiryDate, deliveryDate)
  const daysElapsed = differenceInDays(now, deliveryDate)
  const daysRemaining = Math.max(0, totalDays - daysElapsed)
  const progress = Math.min(100, (daysElapsed / totalDays) * 100)

  // SVG circle properties
  const size = 120
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Color based on days remaining
  const getColor = () => {
    if (daysRemaining <= 3) return 'text-red-500'
    if (daysRemaining <= 7) return 'text-orange-500'
    return 'text-purple-500'
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-100 dark:text-gray-800"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn('transition-all duration-500', getColor())}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold', getColor())}>
            {daysRemaining}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {daysRemaining === 1 ? 'day left' : 'days left'}
          </span>
        </div>
      </div>

      {/* Date info */}
      <div className="mt-4 text-center text-sm">
        <p className="text-gray-500 dark:text-gray-400">
          Day {Math.min(daysElapsed + 1, totalDays)} of {totalDays}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Ends {format(expiryDate, 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}
