'use client'

import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ReportDialogProps {
  type: 'post' | 'comment' | 'user'
  targetId: string
  trigger?: React.ReactNode
}

const reportReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or dangerous behavior' },
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'other', label: 'Other' },
]

export function ReportDialog({ type, targetId, trigger }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          target_id: targetId,
          reason: selectedReason,
          details: details.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Report submitted. We\'ll review it shortly.')
        setIsOpen(false)
        setSelectedReason(null)
        setDetails('')
      } else {
        toast.error(data.error || 'Failed to submit report')
      }
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const typeLabel = type === 'post' ? 'post' : type === 'comment' ? 'comment' : 'user'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-1" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {typeLabel}</DialogTitle>
          <DialogDescription>
            Help us understand what&apos;s wrong with this {typeLabel}. Your report is anonymous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Why are you reporting this?</Label>
            <div className="grid gap-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => setSelectedReason(reason.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedReason === reason.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="details">Additional details</Label>
              <Textarea
                id="details"
                placeholder="Please describe the issue..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedReason || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
