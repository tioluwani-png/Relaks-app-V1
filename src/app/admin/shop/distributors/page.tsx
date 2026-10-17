'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  MessageCircle,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { Distributor } from '@/lib/shop/config'

export default function AdminDistributorsPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)

  // Form state
  const [formCity, setFormCity] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formActive, setFormActive] = useState(true)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadDistributors()
  }, [])

  const loadDistributors = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/shop/distributors')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setDistributors(data)
    } catch (error) {
      console.error('Failed to load distributors:', error)
      toast.error('Failed to load distributors')
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingDistributor(null)
    setFormCity('')
    setFormName('')
    setFormPhone('')
    setFormActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (d: Distributor) => {
    setEditingDistributor(d)
    setFormCity(d.city)
    setFormName(d.name)
    setFormPhone(d.whatsapp_number)
    setFormActive(d.is_active)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formCity.trim() || !formName.trim() || !formPhone.trim()) {
      toast.error('All fields are required')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        city: formCity.trim(),
        name: formName.trim(),
        whatsapp_number: formPhone.trim(),
        is_active: formActive,
      }

      const res = editingDistributor
        ? await fetch(`/api/shop/distributors/${editingDistributor.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/shop/distributors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      toast.success(editingDistributor ? 'Distributor updated' : 'Distributor created')
      setDialogOpen(false)
      loadDistributors()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (d: Distributor) => {
    try {
      const res = await fetch(`/api/shop/distributors/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !d.is_active }),
      })

      if (!res.ok) throw new Error('Failed to update')

      setDistributors((prev) =>
        prev.map((item) =>
          item.id === d.id ? { ...item, is_active: !item.is_active } : item
        )
      )
      toast.success(d.is_active ? 'Distributor hidden' : 'Distributor shown')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shop/distributors/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      setDistributors((prev) => prev.filter((d) => d.id !== id))
      toast.success('Distributor deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteId(null)
    }
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = distributors.findIndex((d) => d.id === id)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= distributors.length) return

    const newList = [...distributors]
    const [moved] = newList.splice(index, 1)
    newList.splice(newIndex, 0, moved)

    // Optimistic update
    setDistributors(newList)

    // Update sort_order for both items
    try {
      await Promise.all([
        fetch(`/api/shop/distributors/${newList[index].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index }),
        }),
        fetch(`/api/shop/distributors/${newList[newIndex].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: newIndex }),
        }),
      ])
    } catch {
      // Revert on error
      loadDistributors()
      toast.error('Failed to reorder')
    }
  }

  const formatPhoneDisplay = (phone: string) => {
    // Format 234XXXXXXXXXX as +234 XXX XXX XXXX
    if (phone.length === 13 && phone.startsWith('234')) {
      return `+234 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`
    }
    return phone
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Distributors
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage distributors outside Lagos
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Distributor</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : distributors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No distributors yet</p>
          <Button onClick={openCreateDialog} variant="outline" className="mt-4">
            Add your first distributor
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {distributors.map((d, index) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border ${
                d.is_active
                  ? 'border-gray-200 dark:border-gray-800'
                  : 'border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(d.id, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4 text-gray-400 rotate-180" />
                </button>
                <button
                  onClick={() => handleReorder(d.id, 'down')}
                  disabled={index === distributors.length - 1}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {d.city}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                </div>
                <a
                  href={`https://wa.me/${d.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  {formatPhoneDisplay(d.whatsapp_number)}
                </a>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(d)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  title={d.is_active ? 'Hide from shop' : 'Show on shop'}
                >
                  {d.is_active ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => openEditDialog(d)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setDeleteId(d.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDistributor ? 'Edit Distributor' : 'Add Distributor'}
            </DialogTitle>
            <DialogDescription>
              {editingDistributor
                ? 'Update the distributor details'
                : 'Add a new distributor for customers outside Lagos'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="e.g. Kano, Abuja"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="name">Distributor Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Dee"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">WhatsApp Number</Label>
              <Input
                id="phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. 09033662304 or +2349033662304"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Any Nigerian mobile format will be normalized automatically
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Show on shop page</Label>
              <Switch
                id="active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingDistributor ? (
                'Save Changes'
              ) : (
                'Add Distributor'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Distributor?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The distributor will be removed from the shop.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
