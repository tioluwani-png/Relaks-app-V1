'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Search, ShoppingBag, Loader2, Package, MessageCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCart } from '@/lib/shop/cart-context'
import { DISTRIBUTORS, getWhatsAppLink, PRODUCT_TYPES } from '@/lib/shop/config'
import type { ShopProduct, ShopProductType } from '@/types/database'

const TYPE_LABELS: Record<ShopProductType | 'all', string> = {
  all: 'All',
  book: 'Books',
  stationery: 'Stationery',
  combo: 'Combos',
  other: 'Other',
}

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<ShopProductType | 'all'>('all')
  const { addItem, itemCount } = useCart()

  useEffect(() => {
    loadProducts()
  }, [selectedType])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') {
        params.set('type', selectedType)
      }

      const res = await fetch(`/api/shop/products?${params}`)
      if (!res.ok) throw new Error('Failed to load products')

      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddToCart = (product: ShopProduct) => {
    if (product.stock_quantity <= 0) {
      toast.error('This item is sold out')
      return
    }
    addItem(product)
    toast.success(`Added "${product.name}" to cart`)
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Shop</h1>
            <Link href="/shop/cart" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ShoppingBag className="w-6 h-6 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-2xl bg-white border-gray-200"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {(['all', ...PRODUCT_TYPES] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No products match your search' : 'No products available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} onAddToCart={() => handleAddToCart(product)} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Distributors Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-6 border border-purple-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Outside Lagos?</h2>
          <p className="text-gray-600 text-sm mb-4">
            Buy from our distributors in your city:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DISTRIBUTORS.map((d) => (
              <a
                key={d.city}
                href={getWhatsAppLink(d.phone, d.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{d.city}</p>
                  <p className="text-xs text-gray-500 truncate">{d.name}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: ShopProduct
  onAddToCart: () => void
}) {
  const isSoldOut = product.stock_quantity <= 0
  const hasDiscount = product.compare_at_price_naira && product.compare_at_price_naira > product.price_naira
  const coverImage = product.images?.[0]

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="aspect-square relative bg-gray-100">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={product.name}
              fill
              className={`object-cover ${isSoldOut ? 'opacity-50 grayscale' : 'group-hover:scale-105'} transition-transform`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.product_type === 'combo' && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full">
                Combo
              </span>
            )}
            {product.edition && (
              <span className="px-2 py-0.5 bg-white/90 text-gray-700 text-xs font-medium rounded-full capitalize">
                {product.edition}
              </span>
            )}
          </div>

          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="px-3 py-1 bg-gray-900 text-white text-sm font-medium rounded-full">
                Sold out
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1 hover:text-purple-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            ₦{product.price_naira.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              ₦{product.compare_at_price_naira!.toLocaleString()}
            </span>
          )}
        </div>

        <Button
          onClick={(e) => {
            e.preventDefault()
            onAddToCart()
          }}
          disabled={isSoldOut}
          className="w-full h-9 text-sm rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50"
        >
          {isSoldOut ? 'Sold out' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  )
}
