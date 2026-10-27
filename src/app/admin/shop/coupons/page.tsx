'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Clock,
  Users,
  Percent,
  DollarSign,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  getCouponStatus,
  COUPON_STATUS_LABELS,
  COUPON_STATUS_COLORS,
  COUPON_DURATION_PRESETS,
  formatCouponDiscount,
} from '@/lib/shop/config'
import type { ShopCoupon, CouponDiscountType } from '@/types/database'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<ShopCoupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<ShopCoupon | null>(null)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formDiscountType, setFormDiscountType] = useState<CouponDiscountType>('percentage')
  const [formDiscountValue, setFormDiscountValue] = useState('')
  const [formStartsAt, setFormStartsAt] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formMinOrderAmount, setFormMinOrderAmount] = useState('')
  const [formInternalNote, setFormInternalNote] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formAllowedDuringSales, setFormAllowedDuringSales] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/shop/coupons')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCoupons(data)
    } catch (error) {
      console.error('Failed to load coupons:', error)
      toast.error('Failed to load coupons')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTimeForInput = (isoString: string) => {
    const date = new Date(isoString)
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    return date.toISOString().slice(0, 16)
  }

  const openCreateDialog = () => {
    setEditingCoupon(null)
    setFormCode('')
    setFormDiscountType('percentage')
    setFormDiscountValue('')
    // Default start time: now
    const now = new Date()
    setFormStartsAt(now.toISOString().slice(0, 16))
    // Default expires: 7 days from now
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setFormExpiresAt(expires.toISOString().slice(0, 16))
    setFormMaxUses('')
    setFormMinOrderAmount('')
    setFormInternalNote('')
    setFormIsActive(true)
    setFormAllowedDuringSales(false)
    setDialogOpen(true)
  }

  const openEditDialog = (coupon: ShopCoupon) => {
    setEditingCoupon(coupon)
    setFormCode(coupon.code)
    setFormDiscountType(coupon.discount_type)
    setFormDiscountValue(coupon.discount_value.toString())
    setFormStartsAt(formatDateTimeForInput(coupon.starts_at))
    setFormExpiresAt(formatDateTimeForInput(coupon.expires_at))
    setFormMaxUses(coupon.max_uses?.toString() || '')
    setFormMinOrderAmount(coupon.min_order_amount?.toString() || '')
    setFormInternalNote(coupon.internal_note || '')
    setFormIsActive(coupon.is_active)
    setFormAllowedDuringSales(coupon.allowed_during_sales ?? false)
    setDialogOpen(true)
  }

  const applyDurationPreset = (hours: number) => {
    const now = new Date()
    setFormStartsAt(now.toISOString().slice(0, 16))
    const expires = new Date(now.getTime() + hours * 60 * 60 * 1000)
    setFormExpiresAt(expires.toISOString().slice(0, 16))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formCode.trim()) {
      toast.error('Code is required')
      return
    }
    const discountValue = parseFloat(formDiscountValue)
    if (isNaN(discountValue) || discountValue <= 0) {
      toast.error('Valid discount value is required')
      return
    }
    if (formDiscountType === 'percentage' && discountValue > 100) {
      toast.error('Percentage cannot exceed 100%')
      return
    }
    if (!formStartsAt || !formExpiresAt) {
      toast.error('Start and expiry dates are required')
      return
    }
    if (new Date(formExpiresAt) <= new Date(formStartsAt)) {
      toast.error('Expiry must be after start date')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        code: formCode.trim().toUpperCase(),
        discount_type: formDiscountType,
        discount_value: discountValue,
        starts_at: new Date(formStartsAt).toISOString(),
        expires_at: new Date(formExpiresAt).toISOString(),
        max_uses: formMaxUses ? parseInt(formMaxUses) : null,
        min_order_amount: formMinOrderAmount ? parseInt(formMinOrderAmount) : null,
        internal_note: formInternalNote.trim() || null,
        is_active: formIsActive,
        allowed_during_sales: formAllowedDuringSales,
      }

      const res = editingCoupon
        ? await fetch(`/api/admin/shop/coupons/${editingCoupon.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/shop/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created')
      setDialogOpen(false)
      loadCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (coupon: ShopCoupon) => {
    try {
      const res = await fetch(`/api/admin/shop/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })

      if (!res.ok) throw new Error('Failed to update')

      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, is_active: !c.is_active } : c
        )
      )
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shop/coupons/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      setCoupons((prev) => prev.filter((c) => c.id !== id))
      toast.success('Coupon deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteId(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Code copied!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Coupons
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage discount codes for the shop
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Coupon</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No coupons yet</p>
          <Button onClick={openCreateDialog} variant="outline" className="mt-4">
            Create your first coupon
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon, index) => {
            const status = getCouponStatus(coupon)
            return (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code and discount */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="flex items-center gap-1.5 font-mono text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        {coupon.code}
                        {copiedCode === coupon.code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 opacity-50" />
                        )}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COUPON_STATUS_COLORS[status]}`}>
                        {COUPON_STATUS_LABELS[status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        {coupon.discount_type === 'percentage' ? (
                          <Percent className="w-3.5 h-3.5" />
                        ) : (
                          <DollarSign className="w-3.5 h-3.5" />
                        )}
                        {formatCouponDiscount(coupon.discount_type, coupon.discount_value)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {coupon.times_used}
                        {coupon.max_uses ? `/${coupon.max_uses}` : ''} used
                      </span>
                      {coupon.total_discount_given > 0 && (
                        <span className="text-green-600 dark:text-green-400">
                          ₦{coupon.total_discount_given.toLocaleString()} saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(coupon.starts_at)} → {formatDateTime(coupon.expires_at)}
                    </div>
                    {coupon.internal_note && (
                      <p className="text-xs text-gray-400 mt-1 italic truncate">
                        {coupon.internal_note}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleActive(coupon)}
                    />
                    <button
                      onClick={() => openEditDialog(coupon)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => setDeleteId(coupon.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? 'Update the coupon details'
                : 'Create a new discount code for customers'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. RELAKS30"
                className="mt-1 font-mono uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Customers will enter this code at checkout
              </p>
            </div>

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formDiscountType}
                  onValueChange={(v) => setFormDiscountType(v as CouponDiscountType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount-value">
                  {formDiscountType === 'percentage' ? 'Percentage' : 'Amount (₦)'}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(e.target.value)}
                  placeholder={formDiscountType === 'percentage' ? '30' : '2000'}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Date/Time */}
            <div>
              <Label>Duration</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {COUPON_DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.hours}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyDurationPreset(preset.hours)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="starts-at" className="text-xs">Starts</Label>
                  <Input
                    id="starts-at"
                    type="datetime-local"
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="expires-at" className="text-xs">Expires</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="max-uses">Max Uses (optional)</Label>
                <Input
                  id="max-uses"
                  type="number"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="min-order">Min Order ₦ (optional)</Label>
                <Input
                  id="min-order"
                  type="number"
                  value={formMinOrderAmount}
                  onChange={(e) => setFormMinOrderAmount(e.target.value)}
                  placeholder="No minimum"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Internal Note */}
            <div>
              <Label htmlFor="note">Internal Note (optional)</Label>
              <Textarea
                id="note"
                value={formInternalNote}
                onChange={(e) => setFormInternalNote(e.target.value)}
                placeholder="e.g. Mental Health Awareness Week"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>

            {/* Allowed During Sales */}
            <div className="flex items-center justify-between">
              <Label htmlFor="allowedDuringSales" className="text-sm">
                Allowed during sales
                <span className="block text-xs text-gray-500 font-normal">
                  Can be used with a store-wide sale
                </span>
              </Label>
              <Switch
                id="allowedDuringSales"
                checked={formAllowedDuringSales}
                onCheckedChange={setFormAllowedDuringSales}
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
              ) : editingCoupon ? (
                'Save Changes'
              ) : (
                'Create Coupon'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Coupon?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The coupon code will no longer work.
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
