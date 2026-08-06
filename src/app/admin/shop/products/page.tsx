'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Search, Package, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PRODUCT_TYPES } from '@/lib/shop/config'
import type { ShopProduct, ShopProductType } from '@/types/database'
import { cn } from '@/lib/utils'

const DEFAULT_FORM = {
  name: '',
  slug: '',
  description: '',
  price_naira: '',
  compare_at_price_naira: '',
  product_type: 'book' as ShopProductType,
  edition: '',
  stock_quantity: '1',
  sort_order: '0',
}

export default function AdminShopProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Image upload state
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .order('sort_order')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts((data || []) as ShopProduct[])
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
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
    setForm({
      ...form,
      name,
      // Auto-generate slug only if creating new product or slug was auto-generated
      slug: !editingId || form.slug === generateSlug(form.name)
        ? generateSlug(name)
        : form.slug,
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file')
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Image must be under 10MB')
          continue
        }

        // Upload to Supabase storage
        const ext = file.name.split('.').pop()
        const fileName = `shop/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('shop-products')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error('Failed to upload image')
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('shop-products')
          .getPublicUrl(fileName)

        setImages((prev) => [...prev, publicUrl])
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim() || !form.price_naira) {
      toast.error('Name, slug, and price are required')
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        price_naira: parseInt(form.price_naira),
        compare_at_price_naira: form.compare_at_price_naira ? parseInt(form.compare_at_price_naira) : null,
        product_type: form.product_type,
        edition: form.edition.trim() || null,
        images,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        sort_order: parseInt(form.sort_order) || 0,
      }

      if (editingId) {
        const { error } = await supabase
          .from('shop_products')
          .update(payload as never)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Product updated!')
      } else {
        const { error } = await supabase.from('shop_products').insert(payload as never)
        if (error) throw error
        toast.success('Product created!')
      }

      setForm(DEFAULT_FORM)
      setImages([])
      setEditingId(null)
      setIsDialogOpen(false)
      loadProducts()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (product: ShopProduct) => {
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price_naira: product.price_naira.toString(),
      compare_at_price_naira: product.compare_at_price_naira?.toString() || '',
      product_type: product.product_type,
      edition: product.edition || '',
      stock_quantity: product.stock_quantity.toString(),
      sort_order: product.sort_order.toString(),
    })
    setImages(product.images || [])
    setEditingId(product.id)
    setIsDialogOpen(true)
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id)
    try {
      const { error } = await supabase
        .from('shop_products')
        .update({ is_active: !currentActive } as never)
        .eq('id', id)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentActive } : p))
      )
      toast.success(currentActive ? 'Product hidden' : 'Product visible')
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to toggle')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return

    try {
      const { error } = await supabase.from('shop_products').delete().eq('id', id)
      if (error) throw error
      toast.success('Product deleted')
      loadProducts()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete')
    }
  }

  const openNewDialog = () => {
    setForm(DEFAULT_FORM)
    setImages([])
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Products</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage products ({products.length})
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 bg-purple-500 hover:bg-purple-600">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No products match your search' : 'No products yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={cn(!product.is_active && 'opacity-60')}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Image */}
                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {product.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      {product.product_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ₦{product.price_naira.toLocaleString()}
                    </p>
                    <p className={cn(
                      "text-sm",
                      product.stock_quantity > 5 ? "text-green-600" :
                      product.stock_quantity > 0 ? "text-amber-600" : "text-red-600"
                    )}>
                      {product.stock_quantity} in stock
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(product.id, product.is_active)}
                    disabled={togglingId === product.id}
                    title={product.is_active ? 'Hide' : 'Show'}
                  >
                    {togglingId === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : product.is_active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Product name"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="product-slug"
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Price (₦) *</Label>
                <Input
                  type="number"
                  value={form.price_naira}
                  onChange={(e) => setForm({ ...form, price_naira: e.target.value })}
                  placeholder="5000"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Compare Price (₦)</Label>
                <Input
                  type="number"
                  value={form.compare_at_price_naira}
                  onChange={(e) => setForm({ ...form, compare_at_price_naira: e.target.value })}
                  placeholder="7000"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">Original price for showing discount</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(v) => setForm({ ...form, product_type: v as ShopProductType })}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Edition</Label>
                <Input
                  value={form.edition}
                  onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  placeholder="e.g. lavender, pink"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product description"
                rows={3}
                disabled={isSaving}
              />
            </div>

            {/* Images */}
            <div>
              <Label>Images</Label>
              <div className="mt-2 space-y-3">
                {/* Image previews */}
                {images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <Image src={img} alt={`Product ${i + 1}`} fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] bg-black/60 text-white rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Click to upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSaving || isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  placeholder="1"
                  min="0"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  placeholder="0"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">Lower = appears first</p>
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
              <Button
                type="submit"
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
