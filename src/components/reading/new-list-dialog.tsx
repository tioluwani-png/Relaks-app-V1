'use client'

import { useState } from 'react'
import { Plus, Loader2, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NewListDialogProps {
  onSubmit: (data: { title: string; description?: string; is_public?: boolean }) => Promise<unknown>
  trigger?: React.ReactNode
}

export function NewListDialog({ onSubmit, trigger }: NewListDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('List name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      })

      if (result) {
        toast.success('Reading list created!')
        setTitle('')
        setDescription('')
        setIsPublic(true)
        setOpen(false)
      } else {
        toast.error('Failed to create list')
      }
    } catch {
      toast.error('Failed to create list')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New List
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Reading List</DialogTitle>
            <DialogDescription>
              Organize your favorite books into a curated list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-title">List Name *</Label>
              <Input
                id="list-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer Reading 2024"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list about? (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isPublic
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-gray-100 dark:bg-gray-800'
                )}>
                  {isPublic ? (
                    <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isPublic ? 'Public' : 'Private'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isPublic
                      ? 'Anyone can see this list'
                      : 'Only you can see this list'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create List'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
