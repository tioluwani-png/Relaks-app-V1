'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Lock,
  Globe,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { BookCard } from '@/components/books/book-card'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { FadeIn } from '@/components/shared/motion'
import { useReadingList } from '@/hooks/use-reading-list'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ListDetailProps {
  listId: string
  currentUserId?: string
}

export function ListDetail({ listId, currentUserId }: ListDetailProps) {
  const router = useRouter()
  const {
    list,
    isLoading,
    error,
    isOwner,
    follow,
    unfollow,
    removeBook,
    updateList,
    deleteList,
  } = useReadingList(listId, currentUserId)

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFollow = async () => {
    if (list?.is_following) {
      await unfollow()
      toast.success('Unfollowed list')
    } else {
      await follow()
      toast.success('Following list')
    }
  }

  const handleEditOpen = () => {
    if (list) {
      setEditTitle(list.title)
      setEditDescription(list.description || '')
      setEditIsPublic(list.is_public)
      setShowEditDialog(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error('Title is required')
      return
    }

    setIsSaving(true)
    const success = await updateList({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      is_public: editIsPublic,
    })

    if (success) {
      toast.success('List updated')
      setShowEditDialog(false)
    } else {
      toast.error('Failed to update list')
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const success = await deleteList()

    if (success) {
      toast.success('List deleted')
      router.push('/reading/lists')
    } else {
      toast.error('Failed to delete list')
      setIsDeleting(false)
    }
  }

  const handleRemoveBook = async (bookId: string, bookTitle: string) => {
    const success = await removeBook(bookId)
    if (success) {
      toast.success(`Removed "${bookTitle}" from list`)
    } else {
      toast.error('Failed to remove book')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-500 mb-4">{error || 'List not found'}</p>
        <Link href="/reading/lists">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lists
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {list.is_public ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-500">
              {list.is_public ? 'Public' : 'Private'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {list.title}
          </h1>
          {list.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {list.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <Link
              href={`/user/${list.user.username}`}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={list.user.avatar_url || undefined} />
                <AvatarFallback>
                  {list.user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-900 dark:text-white">
                {list.user.display_name || list.user.username}
              </span>
              {list.user.is_verified && (
                <VerificationBadge isVerified verificationType={list.user.verification_type} />
              )}
            </Link>
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">{list.follower_count} followers</span>
            </div>
            <span className="text-sm text-gray-500">
              {list.book_count} books
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditOpen}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit List
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : list.is_public ? (
            <Button
              onClick={handleFollow}
              variant={list.is_following ? 'outline' : 'default'}
              className="gap-2"
            >
              {list.is_following ? (
                <>
                  <UserMinus className="h-4 w-4" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
          ) : null}
        </div>
      </FadeIn>

      {/* Books Grid */}
      {list.books.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No books yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            {isOwner
              ? 'Add books to this list from any book detail page'
              : 'This list is empty'}
          </p>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.books.map((book, index) => (
            <FadeIn key={book.id} delay={index * 0.05}>
              <div className="relative group">
                <BookCard book={book} showActions={false} />
                {isOwner && (
                  <button
                    onClick={() => handleRemoveBook(book.id, book.title)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>
              Update your reading list details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="My Reading List"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What's this list about?"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public List</Label>
                <p className="text-sm text-gray-500">
                  Allow others to see and follow this list
                </p>
              </div>
              <Switch
                id="public"
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{list.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
