'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Percent,
  Calendar,
  Package,
  Tag,
  TrendingUp,
  Power,
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  getSaleStatus,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_SCOPE_LABELS,
} from '@/lib/shop/sales'
import type { ShopSale, ShopSaleScope, ShopProductType, ShopProduct } from '@/types/database'

interface SaleWithStats extends ShopSale {
  order_count: number
  revenue: number
}

const PRODUCT_TYPE_LABELS: Record<ShopProductType, string> = {
  book: 'Books',
  stationery: 'Stationery',
  combo: 'Combos',
  other: 'Other',
}

const DURATION_PRESETS = [
  { label: '24 hours', hours: 24 },
  { label: 'This weekend', getEnd: () => {
    const now = new Date()
    const sunday = new Date(now)
    sunday.setDate(now.getDate() + (7 - now.getDay()))
    sunday.setHours(23, 59, 0, 0)
    return sunday
  }},
  { label: '7 days', hours: 168 },
] as const

export default function AdminSalesPage() {
  const [sales, setSales] = useState<SaleWithStats[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<ShopSale | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDiscountPercent, setFormDiscountPercent] = useState('')
  const [formStartsAt, setFormStartsAt] = useState('')
  const [formEndsAt, setFormEndsAt] = useState('')
  const [formScope, setFormScope] = useState<ShopSaleScope>('all')
  const [formProductTypes, setFormProductTypes] = useState<ShopProductType[]>([])
  const [formProductIds, setFormProductIds] = useState<string[]>([])
  const [formBannerText, setFormBannerText] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadSales()
    loadProducts()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/shop/sales')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSales(data)
    } catch (error) {
      console.error('Failed to load sales:', error)
      toast.error('Failed to load sales')
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/shop/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  const formatDateTimeForInput = (isoString: string) => {
    const date = new Date(isoString)
    return date.toISOString().slice(0, 16)
  }

  const openCreateDialog = () => {
    setEditingSale(null)
    setFormName('')
    setFormDiscountPercent('')
    const now = new Date()
    setFormStartsAt(now.toISOString().slice(0, 16))
    const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setFormEndsAt(ends.toISOString().slice(0, 16))
    setFormScope('all')
    setFormProductTypes([])
    setFormProductIds([])
    setFormBannerText('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (sale: ShopSale) => {
    setEditingSale(sale)
    setFormName(sale.name)
    setFormDiscountPercent(sale.discount_percent.toString())
    setFormStartsAt(formatDateTimeForInput(sale.starts_at))
    setFormEndsAt(formatDateTimeForInput(sale.ends_at))
    setFormScope(sale.scope)
    setFormProductTypes(sale.product_types || [])
    setFormProductIds(sale.product_ids || [])
    setFormBannerText(sale.banner_text || '')
    setFormIsActive(sale.is_active)
    setDialogOpen(true)
  }

  const applyDurationPreset = (preset: typeof DURATION_PRESETS[number]) => {
    const now = new Date()
    setFormStartsAt(now.toISOString().slice(0, 16))
    let end: Date
    if ('hours' in preset) {
      end = new Date(now.getTime() + preset.hours * 60 * 60 * 1000)
    } else {
      end = preset.getEnd()
    }
    setFormEndsAt(end.toISOString().slice(0, 16))
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Name is required')
      return
    }
    const discountPercent = parseInt(formDiscountPercent)
    if (isNaN(discountPercent) || discountPercent < 1 || discountPercent > 90) {
      toast.error('Discount must be between 1% and 90%')
      return
    }
    if (!formStartsAt || !formEndsAt) {
      toast.error('Start and end times are required')
      return
    }
    if (new Date(formEndsAt) <= new Date(formStartsAt)) {
      toast.error('End time must be after start time')
      return
    }
    if (formScope === 'types' && formProductTypes.length === 0) {
      toast.error('Select at least one category')
      return
    }
    if (formScope === 'products' && formProductIds.length === 0) {
      toast.error('Select at least one product')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        discount_percent: discountPercent,
        starts_at: new Date(formStartsAt).toISOString(),
        ends_at: new Date(formEndsAt).toISOString(),
        scope: formScope,
        product_types: formScope === 'types' ? formProductTypes : null,
        product_ids: formScope === 'products' ? formProductIds : null,
        banner_text: formBannerText.trim() || null,
        is_active: formIsActive,
      }

      const url = editingSale
        ? `/api/admin/shop/sales/${editingSale.id}`
        : '/api/admin/shop/sales'

      const res = await fetch(url, {
        method: editingSale ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Failed to save sale')
        return
      }

      toast.success(editingSale ? 'Sale updated' : 'Sale created')
      setDialogOpen(false)
      loadSales()
    } catch (error) {
      console.error('Failed to save sale:', error)
      toast.error('Failed to save sale')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shop/sales/${id}`, { method: 'DELETE' })
      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Failed to delete sale')
        return
      }

      toast.success('Sale deleted')
      setDeleteId(null)
      loadSales()
    } catch (error) {
      console.error('Failed to delete sale:', error)
      toast.error('Failed to delete sale')
    }
  }

  const toggleProductType = (type: ShopProductType) => {
    setFormProductTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const toggleProduct = (id: string) => {
    setFormProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 mt-1">Store-wide discounts and promotions</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Sale
        </Button>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border">
          <Percent className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No sales yet</p>
          <Button onClick={openCreateDialog} variant="link" className="mt-2">
            Create your first sale
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale, index) => {
            const status = getSaleStatus(sale)
            return (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {sale.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SALE_STATUS_COLORS[status]}`}>
                        {SALE_STATUS_LABELS[status]}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                        -{sale.discount_percent}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(sale.starts_at).toLocaleDateString()} – {new Date(sale.ends_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {SALE_SCOPE_LABELS[sale.scope]}
                      </span>
                    </div>
                    {sale.banner_text && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                        "{sale.banner_text}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {sale.order_count}
                      </p>
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        ₦{sale.revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(sale)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteId(sale.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit Sale' : 'Create Sale'}</DialogTitle>
            <DialogDescription>
              {editingSale ? 'Update sale details' : 'Set up a new store-wide sale'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Sale Name</Label>
              <Input
                id="name"
                placeholder="e.g. Black Friday, Christmas Week"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount Percent</Label>
              <div className="relative">
                <Input
                  id="discount"
                  type="number"
                  min={1}
                  max={90}
                  placeholder="30"
                  value={formDiscountPercent}
                  onChange={(e) => setFormDiscountPercent(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyDurationPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="starts">Starts</Label>
                  <Input
                    id="starts"
                    type="datetime-local"
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ends">Ends</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    value={formEndsAt}
                    onChange={(e) => setFormEndsAt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={formScope} onValueChange={(v) => setFormScope(v as ShopSaleScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole store</SelectItem>
                  <SelectItem value="types">Selected categories</SelectItem>
                  <SelectItem value="products">Selected products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formScope === 'types' && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['book', 'stationery', 'combo', 'other'] as ShopProductType[]).map((type) => (
                    <label key={type} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={formProductTypes.includes(type)}
                        onCheckedChange={() => toggleProductType(type)}
                      />
                      <span>{PRODUCT_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formScope === 'products' && (
              <div className="space-y-2">
                <Label>Products ({formProductIds.length} selected)</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2 p-2 border-b last:border-0 cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={formProductIds.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <span className="text-sm">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="banner">Banner Text (optional)</Label>
              <Textarea
                id="banner"
                placeholder="e.g. 30% off everything this week"
                value={formBannerText}
                onChange={(e) => setFormBannerText(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingSale ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale?</DialogTitle>
            <DialogDescription>
              This will permanently delete this sale. Orders placed during the sale will keep their discounted prices.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
