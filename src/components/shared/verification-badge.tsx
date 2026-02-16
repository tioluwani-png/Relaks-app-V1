import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificationType } from '@/types/database'

interface VerificationBadgeProps {
  isVerified: boolean
  verificationType?: VerificationType | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const badgeColors: Record<string, string> = {
  staff: 'bg-purple-500',
  creator: 'bg-blue-500',
  brand: 'bg-amber-500',
  notable: 'bg-pink-500',
}

const badgeLabels: Record<string, string> = {
  staff: 'Relaks Staff',
  creator: 'Verified Creator',
  brand: 'Verified Brand',
  notable: 'Notable Account',
}

const sizeStyles = {
  sm: { badge: 'h-3.5 w-3.5', icon: 8 },
  md: { badge: 'h-4 w-4', icon: 10 },
  lg: { badge: 'h-5 w-5', icon: 12 },
}

export function VerificationBadge({
  isVerified,
  verificationType = 'creator',
  size = 'md',
  className,
}: VerificationBadgeProps) {
  if (!isVerified) return null

  const type = verificationType || 'creator'
  const color = badgeColors[type] || badgeColors.creator
  const label = badgeLabels[type] || badgeLabels.creator
  const styles = sizeStyles[size]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full flex-shrink-0',
        styles.badge,
        color,
        className
      )}
      title={label}
    >
      <Check size={styles.icon} className="text-white" strokeWidth={3} />
    </span>
  )
}
