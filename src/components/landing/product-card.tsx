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
  badge,
}: {
  product: ShopProduct
  price: number
  compareAt: number | null
  fromPrice: boolean
  inStock: boolean
  /** Small label on the image, e.g. "Gift set" in the Christmas season */
  badge?: string
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
    'mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors'

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-relaks-ink/10 bg-white transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
      <Link href={href} className="relative block aspect-square bg-relaks-tint">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 250px, 52vw"
            className="object-cover"
          />
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-relaks-ink">
            {badge}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <Link href={href} className="flex min-h-11 items-center font-semibold text-relaks-ink leading-snug hover:underline underline-offset-2">
          {product.name}
        </Link>
        <p className="mt-1 text-relaks-ink">
          <span className="font-bold">
            {fromPrice ? 'From ' : ''}
            {naira(price)}
          </span>
          {compareAt && (
            <>
              {' '}
              <s className="text-sm text-gray-700">
                <span className="sr-only">was </span>
                {naira(compareAt)}
              </s>
            </>
          )}
        </p>
        <div className="mt-auto">
          {product.has_variants ? (
            <Link href={href} className={`${buttonClass} border-2 border-relaks-coral/50 text-relaks-ink hover:border-relaks-coral`}>
              Choose options
            </Link>
          ) : inStock ? (
            <button
              type="button"
              onClick={handleAdd}
              className={`${buttonClass} text-white bg-relaks-ink hover:bg-black`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Add to cart
            </button>
          ) : (
            <span className={`${buttonClass} bg-relaks-tint text-gray-700`}>Sold out</span>
          )}
        </div>
      </div>
    </div>
  )
}
