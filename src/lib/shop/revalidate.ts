import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

/** Cache tag on the landing page's product data (src/lib/landing/data.ts) */
export const SHOP_PRODUCTS_TAG = 'shop-products'

/** After a product changes in admin, refresh the shop, product pages and the homepage books row. */
export function revalidateShop() {
  revalidateTag(SHOP_PRODUCTS_TAG, 'max')
  revalidatePath('/shop')
  revalidatePath('/shop/[slug]', 'page')
  revalidatePath('/')
}
