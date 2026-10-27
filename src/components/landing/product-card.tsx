'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/shop/cart-context'
import type { ShopProduct } from '@/types/database'
import { trackLandingEvent } from './tracked-link'

function naira(n: number) {
  return `₦${n.toLocaleString('en-US')}`
}

export function ProductCard({
  product,
  price,
  compareAt,
  fromPrice,
  inStock,
}: {
  product: ShopProduct
  price: number
  compareAt: number | null
  fromPrice: boolean
  inStock: boolean
}) {
  const { addItem, getItemQuantity } = useCart()
  const router = useRouter()
  const href = `/shop/${product.slug}`
  const image = product.images[0]

  const handleAdd = () => {
    if (getItemQuantity(product.id) >= product.stock_quantity) {
      toast('You already have all available stock in your cart')
      return
    }
    addItem(product)
    trackLandingEvent('books_add_to_cart')
    toast.success(`${product.name} added to cart`, {
      action: { label: 'View cart', onClick: () => router.push('/shop/cart') },
    })
  }

  const buttonClass =
    'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors'

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <Link href={href} className="relative block aspect-square bg-purple-50">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 260px, 65vw"
            className="object-cover"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={href} className="font-semibold text-gray-900 leading-snug line-clamp-2 hover:text-purple-800">
          {product.name}
        </Link>
        <p className="mt-1 text-gray-900">
          <span className="font-bold">
            {fromPrice ? 'From ' : ''}
            {naira(price)}
          </span>
          {compareAt && (
            <>
              {' '}
              <s className="text-sm text-gray-600">
                <span className="sr-only">was </span>
                {naira(compareAt)}
              </s>
            </>
          )}
        </p>
        <div className="mt-auto">
          {product.has_variants ? (
            <Link href={href} className={`${buttonClass} border-2 border-purple-200 text-purple-800 hover:bg-purple-50`}>
              Choose options
            </Link>
          ) : inStock ? (
            <button
              type="button"
              onClick={handleAdd}
              className={`${buttonClass} text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700`}
            >
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          ) : (
            <span className={`${buttonClass} bg-gray-100 text-gray-700`}>Sold out</span>
          )}
        </div>
      </div>
    </div>
  )
}
