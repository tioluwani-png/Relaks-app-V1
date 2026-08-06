'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingBag, Minus, Plus, Loader2, Package, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCart } from '@/lib/shop/cart-context'
import type { ShopProduct } from '@/types/database'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { addItem, getItemQuantity, itemCount } = useCart()

  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProduct = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/shop/products/${slug}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.replace('/shop')
          return
        }
        throw new Error('Failed to load product')
      }

      const data = await res.json()
      setProduct(data)
    } catch (error) {
      console.error('Failed to load product:', error)
      toast.error('Failed to load product')
      router.replace('/shop')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product || product.stock_quantity <= 0) return

    addItem(product, quantity)
    setAddedToCart(true)
    toast.success(`Added ${quantity}× "${product.name}" to cart`)

    setTimeout(() => setAddedToCart(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!product) {
    return null
  }

  const isSoldOut = product.stock_quantity <= 0
  const hasDiscount = product.compare_at_price_naira && product.compare_at_price_naira > product.price_naira
  const inCartQty = getItemQuantity(product.id)
  const maxAddable = Math.max(0, product.stock_quantity - inCartQty)
  const images = product.images?.length ? product.images : []

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square relative bg-white rounded-3xl overflow-hidden border border-gray-100"
            >
              {images[selectedImage] ? (
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  className={`object-cover ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-300" />
                </div>
              )}

              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="px-4 py-2 bg-gray-900 text-white font-medium rounded-full">
                    Sold out
                  </span>
                </div>
              )}
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? 'border-purple-500' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {product.product_type === 'combo' && (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full">
                  Combo Deal
                </span>
              )}
              {product.edition && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full capitalize">
                  {product.edition} Edition
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                ₦{product.price_naira.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  ₦{product.compare_at_price_naira!.toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Stock */}
            {!isSoldOut && product.stock_quantity <= 5 && (
              <p className="text-amber-600 text-sm font-medium">
                Only {product.stock_quantity} left in stock
              </p>
            )}

            {/* Quantity selector */}
            {!isSoldOut && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxAddable, q + 1))}
                    disabled={quantity >= maxAddable}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {inCartQty > 0 && (
                  <p className="text-sm text-purple-600">{inCartQty} already in cart</p>
                )}
              </div>
            )}

            {/* Add to Cart */}
            <Button
              onClick={handleAddToCart}
              disabled={isSoldOut || maxAddable === 0}
              className="w-full h-14 text-lg rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-50"
            >
              {addedToCart ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Added!
                </>
              ) : isSoldOut ? (
                'Sold out'
              ) : maxAddable === 0 ? (
                'Max quantity in cart'
              ) : (
                <>
                  Add to Cart — ₦{(product.price_naira * quantity).toLocaleString()}
                </>
              )}
            </Button>

            {/* Continue shopping */}
            <Link href="/shop" className="block">
              <Button variant="outline" className="w-full h-12 rounded-2xl">
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
