'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { EditionRecord } from '@/types/database'

const COLOR_THEMES = [
  { name: 'Purple',  color: '#8b5cf6', from: 'from-purple-500',  to: 'to-violet-600',  bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { name: 'Pink',    color: '#ec4899', from: 'from-pink-500',    to: 'to-rose-500',     bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { name: 'Red',     color: '#ef4444', from: 'from-red-500',     to: 'to-rose-600',     bg: 'bg-red-50 dark:bg-red-950/30' },
  { name: 'Orange',  color: '#f97316', from: 'from-orange-500',  to: 'to-amber-500',    bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { name: 'Yellow',  color: '#eab308', from: 'from-yellow-500',  to: 'to-amber-500',    bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { name: 'Green',   color: '#22c55e', from: 'from-green-500',   to: 'to-emerald-600',  bg: 'bg-green-50 dark:bg-green-950/30' },
  { name: 'Teal',    color: '#14b8a6', from: 'from-teal-500',    to: 'to-cyan-600',     bg: 'bg-teal-50 dark:bg-teal-950/30' },
  { name: 'Blue',    color: '#3b82f6', from: 'from-blue-500',    to: 'to-indigo-600',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { name: 'Indigo',  color: '#6366f1', from: 'from-indigo-500',  to: 'to-violet-600',   bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { name: 'Violet',  color: '#7c3aed', from: 'from-violet-500',  to: 'to-purple-600',   bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { name: 'Fuchsia', color: '#d946ef', from: 'from-fuchsia-500', to: 'to-pink-600',     bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30' },
  { name: 'Rose',    color: '#f43f5e', from: 'from-rose-500',    to: 'to-pink-600',     bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { name: 'Christmas', color: '#C41E3A', from: 'from-red-500',   to: 'to-green-600',    bg: 'bg-red-50 dark:bg-red-950/30' },
]

const DEFAULT_THEME = COLOR_THEMES[0]

const DEFAULT_FORM = {
  slug: '',
  display_name: '',
  description: '',
  color: DEFAULT_THEME.color,
  gradient_from: DEFAULT_THEME.from,
  gradient_to: DEFAULT_THEME.to,
  gradient_bg: DEFAULT_THEME.bg,
  cover_image_url: '',
  is_active: true,
  display_order: 0,
}

function detectTheme(from: string, to: string): string {
  const match = COLOR_THEMES.find(t => t.from === from && t.to === to)
  return match?.name || 'custom'
}

export default function AdminEditionsPage() {
  const supabase = createClient()
  const [editions, setEditions] = useState<EditionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME.name)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    loadEditions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEditions = async () => {
    try {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setEditions((data as EditionRecord[]) || [])
    } catch (error) {
      console.error('Failed to load editions:', error)
      toast.error('Failed to load editions')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      display_name: name,
      ...(editingId ? {} : { slug: generateSlug(name) }),
    }))
  }

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName)
    const theme = COLOR_THEMES.find(t => t.name === themeName)
    if (theme) {
      setForm(prev => ({
        ...prev,
        color: theme.color,
        gradient_from: theme.from,
        gradient_to: theme.to,
        gradient_bg: theme.bg,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!form.slug || !form.display_name || !form.color) {
      toast.error('Slug, name, and color are required')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...form,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
        ...(editingId ? { id: editingId } : {}),
      }

      const response = await fetch('/api/admin/editions', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save edition')
      }

      toast.success(editingId ? 'Edition updated!' : 'Edition created!')
      setForm(DEFAULT_FORM)
      setSelectedTheme(DEFAULT_THEME.name)
      setEditingId(null)
      loadEditions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (edition: EditionRecord) => {
    setEditingId(edition.id)
    setForm({
      slug: edition.slug,
      display_name: edition.display_name,
      description: edition.description || '',
      color: edition.color,
      gradient_from: edition.gradient_from,
      gradient_to: edition.gradient_to,
      gradient_bg: edition.gradient_bg,
      cover_image_url: edition.cover_image_url || '',
      is_active: edition.is_active,
      display_order: edition.display_order,
    })
    setSelectedTheme(detectTheme(edition.gradient_from, edition.gradient_to))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setSelectedTheme(DEFAULT_THEME.name)
  }

  const handleToggleActive = async (edition: EditionRecord) => {
    setTogglingId(edition.id)
    try {
      const response = await fetch('/api/admin/editions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: edition.id, is_active: !edition.is_active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update')
      }

      toast.success(`Edition ${edition.is_active ? 'deactivated' : 'activated'}`)
      loadEditions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (edition: EditionRecord) => {
    if (!confirm(`Deactivate "${edition.display_name}"? It will be hidden from users but existing data will be preserved.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/editions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: edition.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success('Edition deactivated')
      loadEditions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Editions</h1>

      <div className="space-y-6">
        {/* Create/Edit Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Edition' : 'Add New Edition'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  placeholder="e.g., Summer Edition"
                  value={form.display_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  placeholder="e.g., summer"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                />
                <p className="text-xs text-muted-foreground">Used in URLs and database. Lowercase, no spaces.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="A brief description of this edition..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Color Theme Picker */}
            <div className="space-y-2">
              <Label>Color Theme *</Label>
              <Select value={selectedTheme} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a color theme" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_THEMES.map((theme) => (
                    <SelectItem key={theme.name} value={theme.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ backgroundColor: theme.color }}
                        />
                        {theme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Color swatches for quick preview */}
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => handleThemeChange(theme.name)}
                    title={theme.name}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedTheme === theme.name
                        ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: theme.color }}
                  />
                ))}
              </div>
            </div>

            {/* Gradient Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className={`rounded-xl overflow-hidden ${form.gradient_bg.split(' ').slice(0, 2).join(' ')}`}>
                <div className={`h-2 bg-gradient-to-r ${form.gradient_from} ${form.gradient_to}`} />
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{form.display_name || 'Edition Name'}</p>
                    <p className="text-sm text-muted-foreground">Preview of how this will look</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${form.gradient_from} ${form.gradient_to}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Image URL (optional)</Label>
                <Input
                  placeholder="https://..."
                  value={form.cover_image_url}
                  onChange={(e) => setForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!form.slug || !form.display_name || !form.color || isSaving}
                className="flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Update Edition
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Edition
                  </>
                )}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editions List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            All Editions ({editions.length})
          </h2>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : editions.length === 0 ? (
            <p className="text-gray-500">No editions yet. Create your first one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Preview</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Slug</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editions.map((edition) => (
                    <tr
                      key={edition.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-gray-400">
                          <GripVertical size={14} />
                          <span className="text-sm">{edition.display_order}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-8 w-16 rounded-md bg-gradient-to-r ${edition.gradient_from} ${edition.gradient_to}`}
                          />
                          <div
                            className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                            style={{ backgroundColor: edition.color }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{edition.display_name}</p>
                        {edition.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{edition.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{edition.slug}</code>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          edition.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {edition.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(edition)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(edition)}
                            disabled={togglingId === edition.id}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            title={edition.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {togglingId === edition.id ? (
                              <Loader2 size={16} className="animate-spin text-gray-500" />
                            ) : edition.is_active ? (
                              <EyeOff size={16} className="text-orange-500" />
                            ) : (
                              <Eye size={16} className="text-green-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(edition)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
