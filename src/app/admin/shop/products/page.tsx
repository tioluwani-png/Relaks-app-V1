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
import { uploadShopProductImage } from '@/lib/upload'
import { PRODUCT_TYPES } from '@/lib/shop/config'
import type {
  ShopProduct,
  ShopProductType,
  ShopProductOption,
  ShopProductOptionValue,
  ShopProductVariant,
} from '@/types/database'
import { cn } from '@/lib/utils'

// Types for variant editing
interface OptionDraft {
  id?: string
  name: string
  values: { id?: string; value: string }[]
}

interface VariantDraft {
  id?: string
  optionValues: Record<string, string>
  sku: string
  price_naira: string
  stock_quantity: string
  image_url: string
  is_active: boolean
}

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
  has_variants: false,
}

// Generate variant combinations from options
function generateVariantCombinations(options: OptionDraft[]): Record<string, string>[] {
  if (options.length === 0 || options.every(o => o.values.length === 0)) {
    return []
  }

  const validOptions = options.filter(o => o.name && o.values.length > 0)
  if (validOptions.length === 0) return []

  let combinations: Record<string, string>[] = [{}]

  for (const option of validOptions) {
    const newCombinations: Record<string, string>[] = []
    for (const combo of combinations) {
      for (const val of option.values) {
        if (val.value.trim()) {
          newCombinations.push({ ...combo, [option.name]: val.value })
        }
      }
    }
    combinations = newCombinations
  }

  return combinations
}

// Get variant label from option values
function getVariantLabel(optionValues: Record<string, string>): string {
  return Object.values(optionValues).join(' / ')
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

  // Variants state
  const [options, setOptions] = useState<OptionDraft[]>([])
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [newOptionValue, setNewOptionValue] = useState<Record<number, string>>({})

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
        try {
          // Use the upload utility which handles validation, compression, and upload
          const publicUrl = await uploadShopProductImage(file)
          setImages((prev) => [...prev, publicUrl])
        } catch (uploadErr) {
          const errorMessage = uploadErr instanceof Error ? uploadErr.message : 'Unknown error'
          console.error('Upload error:', uploadErr)
          toast.error(`Upload failed: ${errorMessage}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${errorMessage}`)
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

    // Validate variants if has_variants is true
    if (form.has_variants && variants.length === 0) {
      toast.error('Please add at least one variant')
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
        stock_quantity: form.has_variants ? 0 : (parseInt(form.stock_quantity) || 0),
        sort_order: parseInt(form.sort_order) || 0,
        has_variants: form.has_variants,
      }

      let productId = editingId

      if (editingId) {
        const { error } = await supabase
          .from('shop_products')
          .update(payload as never)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('shop_products')
          .insert(payload as never)
          .select('id')
          .single()

        if (error) throw error
        productId = (data as { id: string }).id
      }

      // Save options and variants if has_variants is true
      if (form.has_variants && productId) {
        // Delete existing options and variants (cascade will handle values and variants)
        if (editingId) {
          await supabase.from('shop_product_options').delete().eq('product_id', productId)
          await supabase.from('shop_product_variants').delete().eq('product_id', productId)
        }

        // Insert options and values
        for (let optIdx = 0; optIdx < options.length; optIdx++) {
          const opt = options[optIdx]
          if (!opt.name.trim() || opt.values.length === 0) continue

          const { data: optData, error: optError } = await supabase
            .from('shop_product_options')
            .insert({
              product_id: productId,
              name: opt.name.trim(),
              sort_order: optIdx,
            } as never)
            .select('id')
            .single()

          if (optError) throw optError

          const optionId = (optData as { id: string }).id

          // Insert option values
          const valuesToInsert = opt.values
            .filter((v) => v.value.trim())
            .map((v, vIdx) => ({
              option_id: optionId,
              value: v.value.trim(),
              sort_order: vIdx,
            }))

          if (valuesToInsert.length > 0) {
            const { error: valError } = await supabase
              .from('shop_product_option_values')
              .insert(valuesToInsert as never)

            if (valError) throw valError
          }
        }

        // Insert variants
        const variantsToInsert = variants.map((v, idx) => ({
          product_id: productId,
          option_values: v.optionValues,
          sku: v.sku.trim() || null,
          price_naira: v.price_naira ? parseInt(v.price_naira) : null,
          stock_quantity: parseInt(v.stock_quantity) || 0,
          image_url: v.image_url || null,
          is_active: v.is_active,
          sort_order: idx,
        }))

        if (variantsToInsert.length > 0) {
          const { error: varError } = await supabase
            .from('shop_product_variants')
            .insert(variantsToInsert as never)

          if (varError) throw varError
        }
      }

      toast.success(editingId ? 'Product updated!' : 'Product created!')
      setForm(DEFAULT_FORM)
      setImages([])
      setOptions([])
      setVariants([])
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

  const handleEdit = async (product: ShopProduct) => {
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
      has_variants: product.has_variants,
    })
    setImages(product.images || [])
    setEditingId(product.id)

    // Load options and variants if product has variants
    if (product.has_variants) {
      try {
        // Load options
        const { data: optionsData } = await supabase
          .from('shop_product_options')
          .select('*')
          .eq('product_id', product.id)
          .order('sort_order')

        const loadedOptions: OptionDraft[] = []
        const optionIds = (optionsData || []).map((o: ShopProductOption) => o.id)

        if (optionIds.length > 0) {
          // Load option values
          const { data: valuesData } = await supabase
            .from('shop_product_option_values')
            .select('*')
            .in('option_id', optionIds)
            .order('sort_order')

          for (const opt of (optionsData || []) as ShopProductOption[]) {
            const optValues = ((valuesData || []) as ShopProductOptionValue[])
              .filter((v) => v.option_id === opt.id)
              .map((v) => ({ id: v.id, value: v.value }))
            loadedOptions.push({ id: opt.id, name: opt.name, values: optValues })
          }
        }
        setOptions(loadedOptions)

        // Load variants
        const { data: variantsData } = await supabase
          .from('shop_product_variants')
          .select('*')
          .eq('product_id', product.id)
          .order('sort_order')

        const loadedVariants: VariantDraft[] = ((variantsData || []) as ShopProductVariant[]).map((v) => ({
          id: v.id,
          optionValues: v.option_values,
          sku: v.sku || '',
          price_naira: v.price_naira?.toString() || '',
          stock_quantity: v.stock_quantity.toString(),
          image_url: v.image_url || '',
          is_active: v.is_active,
        }))
        setVariants(loadedVariants)
      } catch (error) {
        console.error('Failed to load variants:', error)
        setOptions([])
        setVariants([])
      }
    } else {
      setOptions([])
      setVariants([])
    }
    setNewOptionValue({})
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
    setOptions([])
    setVariants([])
    setNewOptionValue({})
    setEditingId(null)
    setIsDialogOpen(true)
  }

  // Handle option name change
  const handleOptionNameChange = (index: number, name: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], name }
    setOptions(newOptions)
    // Regenerate variants
    regenerateVariants(newOptions)
  }

  // Add value to option
  const handleAddOptionValue = (optionIndex: number) => {
    const value = newOptionValue[optionIndex]?.trim()
    if (!value) return

    const newOptions = [...options]
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      values: [...newOptions[optionIndex].values, { value }],
    }
    setOptions(newOptions)
    setNewOptionValue({ ...newOptionValue, [optionIndex]: '' })
    // Regenerate variants
    regenerateVariants(newOptions)
  }

  // Remove value from option
  const handleRemoveOptionValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options]
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      values: newOptions[optionIndex].values.filter((_, i) => i !== valueIndex),
    }
    setOptions(newOptions)
    // Regenerate variants
    regenerateVariants(newOptions)
  }

  // Add new option (max 2)
  const handleAddOption = () => {
    if (options.length >= 2) return
    setOptions([...options, { name: '', values: [] }])
  }

  // Remove option
  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions)
    regenerateVariants(newOptions)
  }

  // Regenerate variants when options change
  const regenerateVariants = (newOptions: OptionDraft[]) => {
    const combinations = generateVariantCombinations(newOptions)

    // Preserve existing variant data where possible
    const newVariants: VariantDraft[] = combinations.map((combo) => {
      const label = getVariantLabel(combo)
      const existing = variants.find((v) => getVariantLabel(v.optionValues) === label)
      return existing || {
        optionValues: combo,
        sku: '',
        price_naira: '',
        stock_quantity: '0',
        image_url: '',
        is_active: true,
      }
    })
    setVariants(newVariants)
  }

  // Update variant field
  const updateVariant = (index: number, field: keyof VariantDraft, value: string | boolean) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
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
                    {product.has_variants && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                        Variants
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ₦{product.price_naira.toLocaleString()}
                    </p>
                    {!product.has_variants && (
                      <p className={cn(
                        "text-sm",
                        product.stock_quantity > 5 ? "text-green-600" :
                        product.stock_quantity > 0 ? "text-amber-600" : "text-red-600"
                      )}>
                        {product.stock_quantity} in stock
                      </p>
                    )}
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
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSaving || isUploading}
                  />
                </label>
              </div>
            </div>

            {/* Variants Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div>
                <Label className="font-medium">This product has variations</Label>
                <p className="text-xs text-gray-500 mt-1">
                  E.g., different editions, colors, or sizes
                </p>
              </div>
              <Switch
                checked={form.has_variants}
                onCheckedChange={(checked) => {
                  setForm({ ...form, has_variants: checked })
                  if (checked && options.length === 0) {
                    setOptions([{ name: '', values: [] }])
                  }
                }}
                disabled={isSaving}
              />
            </div>

            {/* Options Builder (when has_variants is true) */}
            {form.has_variants && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Product Options</Label>
                  {options.length < 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                      disabled={isSaving}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>

                {options.map((option, optIdx) => (
                  <div key={optIdx} className="space-y-2 p-3 border rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex gap-2">
                      <Input
                        value={option.name}
                        onChange={(e) => handleOptionNameChange(optIdx, e.target.value)}
                        placeholder="Option name (e.g., Edition, Color)"
                        className="flex-1"
                        disabled={isSaving}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(optIdx)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Option Values */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {option.values.map((val, valIdx) => (
                        <span
                          key={valIdx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {val.value}
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionValue(optIdx, valIdx)}
                            className="hover:text-purple-600"
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add Value Input */}
                    <div className="flex gap-2">
                      <Input
                        value={newOptionValue[optIdx] || ''}
                        onChange={(e) => setNewOptionValue({ ...newOptionValue, [optIdx]: e.target.value })}
                        placeholder="Add value (e.g., Lavender)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddOptionValue(optIdx)
                          }
                        }}
                        disabled={isSaving}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOptionValue(optIdx)}
                        disabled={isSaving || !newOptionValue[optIdx]?.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Variants Table */}
                {variants.length > 0 && (
                  <div className="mt-4">
                    <Label className="font-medium mb-2 block">
                      Variants ({variants.length})
                    </Label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Variant</th>
                            <th className="px-3 py-2 text-left font-medium">Price</th>
                            <th className="px-3 py-2 text-left font-medium">Stock</th>
                            <th className="px-3 py-2 text-center font-medium">Active</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {variants.map((variant, idx) => (
                            <tr key={idx} className={cn(!variant.is_active && 'opacity-50')}>
                              <td className="px-3 py-2">
                                <span className="font-medium">
                                  {getVariantLabel(variant.optionValues)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={variant.price_naira}
                                  onChange={(e) => updateVariant(idx, 'price_naira', e.target.value)}
                                  placeholder="Inherit"
                                  className="w-24 h-8 text-sm"
                                  disabled={isSaving}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={variant.stock_quantity}
                                  onChange={(e) => updateVariant(idx, 'stock_quantity', e.target.value)}
                                  className="w-20 h-8 text-sm"
                                  min="0"
                                  disabled={isSaving}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Switch
                                  checked={variant.is_active}
                                  onCheckedChange={(checked) => updateVariant(idx, 'is_active', checked)}
                                  disabled={isSaving}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Leave price empty to inherit from product price (₦{form.price_naira || '0'})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Stock (only when no variants) */}
            {!form.has_variants && (
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
            )}

            {/* Sort Order (when has variants) */}
            {form.has_variants && (
              <div className="w-1/2">
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
            )}

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
