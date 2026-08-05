'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RenewButtonProps {
  planId: string
  booksPerCycle: number
  className?: string
}

export function RenewButton({ planId, booksPerCycle, className }: RenewButtonProps) {
  return (
    <div className={cn('rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4', className)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
          <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            Ready to renew?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Pick {booksPerCycle} new books for your next cycle
          </p>
        </div>
      </div>

      <Link href={`/books?plan=${planId}`} className="block mt-4">
        <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <RefreshCw className="h-4 w-4 mr-2" />
          Renew Now
        </Button>
      </Link>
    </div>
  )
}
