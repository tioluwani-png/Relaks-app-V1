'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Search, BookOpen, Upload, X, Ban, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { uploadBookCover, validateImageFile, fileToDataUrl } from '@/lib/upload'
import type { Book, BookGenre } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Extended book type for rental system
type ExtendedBook = Book & {
  total_copies: number
  available_copies: number
  manually_unavailable: boolean
  genre: BookGenre | null
  on_loan_count?: number // Computed: total - available
}

const DEFAULT_FORM = {
  title: '',
  author: '',
  genre_id: '',
  description: '',
  cover_url: '',
  isbn: '',
  page_count: '',
  published_year: '',
  total_copies: '1',
}

// Helper to get availability color
function getAvailabilityColor(available: number, total: number): string {
  if (total === 0) return 'text-gray-400'
  const ratio = available / total
  if (ratio === 1) return 'text-green-600'
  if (ratio > 0) return 'text-amber-600'
  return 'text-red-600'
}

function getAvailabilityBg(available: number, total: number): string {
  if (total === 0) return 'bg-gray-100'
  const ratio = available / total
  if (ratio === 1) return 'bg-green-50'
  if (ratio > 0) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function ClubAdminBooksPage() {
  const supabase = createClient()
  const [books, setBooks] = useState<ExtendedBook[]>([])
  const [genres, setGenres] = useState<BookGenre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingUnavailableId, setTogglingUnavailableId] = useState<string | null>(null)

  // Cover image upload state
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // For editing - track original total_copies to compute available delta
  const [originalTotalCopies, setOriginalTotalCopies] = useState<number>(1)

  useEffect(() => {
    loadBooks()
    loadGenres()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          genre:book_genres(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Compute on_loan_count for each book
      const booksWithLoanCount = (data || []).map(book => {
        const b = book as ExtendedBook
        return {
          ...b,
          on_loan_count: Math.max(0, (b.total_copies || 0) - (b.available_copies || 0))
        }
      })

      setBooks(booksWithLoanCount)
    } catch (error) {
      console.error('Failed to load books:', error)
      toast.error('Failed to load books')
    } finally {
      setIsLoading(false)
    }
  }

  const loadGenres = async () => {
    const { data } = await supabase
      .from('book_genres')
      .select('*')
      .order('display_order')

    setGenres(data || [])
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = await validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setCoverFile(file)

    // Create preview
    const preview = await fileToDataUrl(file)
    setCoverPreview(preview)
  }

  const clearCoverFile = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.author.trim()) {
      toast.error('Title and author are required')
      return
    }

    setIsSaving(true)

    try {
      let coverUrl = form.cover_url.trim() || null

      // Upload cover image if a new file is selected
      if (coverFile) {
        setIsUploading(true)
        try {
          coverUrl = await uploadBookCover(coverFile, editingId || undefined)
        } catch (uploadError) {
          console.error('Cover upload failed:', uploadError)
          toast.error('Failed to upload cover image')
          setIsUploading(false)
          setIsSaving(false)
          return
        }
        setIsUploading(false)
      }

      const newTotalCopies = form.total_copies ? parseInt(form.total_copies) : 1

      // For new books, available = total
      // For edits, adjust available by the delta (e.g., if total goes from 3 to 5, add 2 to available)
      let newAvailableCopies: number
      if (editingId) {
        const existingBook = books.find(b => b.id === editingId)
        const currentAvailable = existingBook?.available_copies ?? originalTotalCopies
        const delta = newTotalCopies - originalTotalCopies
        newAvailableCopies = Math.max(0, Math.min(currentAvailable + delta, newTotalCopies))
      } else {
        newAvailableCopies = newTotalCopies
      }

      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        genre_id: form.genre_id || null,
        description: form.description.trim() || null,
        cover_url: coverUrl,
        isbn: form.isbn.trim() || null,
        page_count: form.page_count ? parseInt(form.page_count) : null,
        published_year: form.published_year ? parseInt(form.published_year) : null,
        total_copies: newTotalCopies,
        available_copies: newAvailableCopies,
      }

      const response = await fetch(
        editingId ? `/api/books/${editingId}` : '/api/books',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save book')
      }

      toast.success(editingId ? 'Book updated!' : 'Book created!')
      setForm(DEFAULT_FORM)
      setCoverFile(null)
      setCoverPreview(null)
      setEditingId(null)
      setIsDialogOpen(false)
      loadBooks()
    } catch (error) {
      console.error('Error saving book:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save book')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (book: ExtendedBook) => {
    setForm({
      title: book.title,
      author: book.author,
      genre_id: book.genre_id || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
      isbn: book.isbn || '',
      page_count: book.page_count?.toString() || '',
      published_year: book.published_year?.toString() || '',
      total_copies: book.total_copies?.toString() || '1',
    })
    // Track original total for computing available delta
    setOriginalTotalCopies(book.total_copies || 1)
    // Reset file state when editing
    setCoverFile(null)
    setCoverPreview(null)
    setEditingId(book.id)
    setIsDialogOpen(true)
  }

  const handleToggleManuallyUnavailable = async (id: string, currentValue: boolean) => {
    setTogglingUnavailableId(id)

    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manually_unavailable: !currentValue }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle availability')
      }

      setBooks(prev =>
        prev.map(book =>
          book.id === id ? { ...book, manually_unavailable: !currentValue } : book
        )
      )
      toast.success(currentValue ? 'Book marked available' : 'Book marked unavailable')
    } catch (error) {
      console.error('Error toggling availability:', error)
      toast.error('Failed to toggle availability')
    } finally {
      setTogglingUnavailableId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete book')
      }

      toast.success('Book deleted')
      loadBooks()
    } catch (error) {
      console.error('Error deleting book:', error)
      toast.error('Failed to delete book')
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id)

    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle status')
      }

      setBooks(prev =>
        prev.map(book =>
          book.id === id ? { ...book, is_active: !currentActive } : book
        )
      )
      toast.success(currentActive ? 'Book hidden' : 'Book visible')
    } catch (error) {
      console.error('Error toggling book:', error)
      toast.error('Failed to toggle status')
    } finally {
      setTogglingId(null)
    }
  }

  const openNewDialog = () => {
    setForm(DEFAULT_FORM)
    setCoverFile(null)
    setCoverPreview(null)
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const filteredBooks = books.filter(
    book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Books</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage the book catalog ({books.length} books)
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4" />
          Add Book
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search books..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Books List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No books match your search' : 'No books yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBooks.map((book) => {
            const available = book.available_copies ?? 0
            const total = book.total_copies ?? 0
            const onLoan = book.on_loan_count ?? Math.max(0, total - available)

            return (
            <Card
              key={book.id}
              className={cn(
                !book.is_active && 'opacity-60',
                book.manually_unavailable && 'border-red-200 bg-red-50/30'
              )}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Cover */}
                <div className="shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      width={64}
                      height={96}
                      className={cn(
                        "w-full h-full object-cover",
                        book.manually_unavailable && "opacity-50"
                      )}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                  {book.manually_unavailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                      <Ban className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {book.title}
                    </h3>
                    {book.manually_unavailable && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {book.author}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {book.genre && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: book.genre.color }}
                      >
                        {book.genre.name}
                      </span>
                    )}
                    {/* Availability badge - color coded */}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getAvailabilityBg(available, total),
                      getAvailabilityColor(available, total)
                    )}>
                      {available} of {total} available
                    </span>
                    {/* On loan count with link */}
                    {onLoan > 0 && (
                      <Link
                        href={`/club-admin/orders?bookId=${book.id}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        {onLoan} on loan
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Manual availability toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <Switch
                      checked={!book.manually_unavailable}
                      onCheckedChange={() => handleToggleManuallyUnavailable(book.id, book.manually_unavailable)}
                      disabled={togglingUnavailableId === book.id}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-xs text-gray-500">
                      {book.manually_unavailable ? 'Blocked' : 'Rentable'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(book.id, book.is_active)}
                      disabled={togglingId === book.id}
                      title={book.is_active ? 'Hide from catalog' : 'Show in catalog'}
                    >
                      {togglingId === book.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : book.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(book)}
                      title="Edit book"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
                      title="Delete book"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Book' : 'Add New Book'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Book title"
                  disabled={isSaving}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Author *</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                  disabled={isSaving}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Genre</Label>
                <Select
                  value={form.genre_id}
                  onValueChange={(v) => setForm({ ...form, genre_id: v })}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Book description"
                  rows={4}
                  disabled={isSaving}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Cover Image</Label>
                <div className="mt-2">
                  {/* Preview */}
                  {(coverPreview || form.cover_url) && (
                    <div className="relative w-32 h-48 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={coverPreview || form.cover_url}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          clearCoverFile()
                          setForm({ ...form, cover_url: '' })
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload Area */}
                  {!coverPreview && !form.cover_url && (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload cover image</span>
                      <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP (max 10MB)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isSaving}
                      />
                    </label>
                  )}

                  {/* Change Image Button */}
                  {(coverPreview || form.cover_url) && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Upload className="h-4 w-4" />
                      Change Image
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isSaving}
                      />
                    </label>
                  )}

                  {isUploading && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-orange-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading cover image...
                    </div>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>How many copies do you have?</Label>
                <Input
                  type="number"
                  value={form.total_copies}
                  onChange={(e) => setForm({ ...form, total_copies: e.target.value })}
                  placeholder="1"
                  min="1"
                  disabled={isSaving}
                />
                {editingId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Changing this will automatically adjust available copies
                  </p>
                )}
              </div>
              <div>
                <Label>ISBN</Label>
                <Input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  placeholder="ISBN"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Page Count</Label>
                <Input
                  type="number"
                  value={form.page_count}
                  onChange={(e) => setForm({ ...form, page_count: e.target.value })}
                  placeholder="Number of pages"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Published Year</Label>
                <Input
                  type="number"
                  value={form.published_year}
                  onChange={(e) => setForm({ ...form, published_year: e.target.value })}
                  placeholder="Year"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Update Book'
                ) : (
                  'Add Book'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
