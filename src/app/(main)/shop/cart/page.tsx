'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/shop/cart-context'

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, itemCount } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFBF5]">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/shop"
                className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Cart</h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some items to get started!</p>
            <Link href="/shop">
              <Button className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500">
                Browse Shop
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-40">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/shop"
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Cart ({itemCount})</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={item.product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4"
          >
            {/* Image */}
            <Link href={`/shop/${item.product.slug}`} className="shrink-0">
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden relative">
                {item.product.images?.[0] ? (
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
            </Link>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <Link href={`/shop/${item.product.slug}`}>
                <h3 className="font-medium text-gray-900 hover:text-purple-600 transition-colors line-clamp-2">
                  {item.product.name}
                </h3>
              </Link>
              <p className="text-lg font-bold text-gray-900 mt-1">
                ₦{item.product.price_naira.toLocaleString()}
              </p>

              {/* Quantity controls */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock_quantity}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.product.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Subtotal note */}
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-gray-600 text-sm">Delivery fees calculated at checkout</p>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-xl font-bold text-gray-900">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>
          <Link href="/shop/checkout">
            <Button className="w-full h-14 text-lg rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90">
              Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
