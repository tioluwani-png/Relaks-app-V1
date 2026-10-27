/**
 * Shared stock and variant rules for the shop. Used by the product page, shop grid,
 * landing books row, cart, order creation and the payment stock decrement.
 *
 * Rule: when a product has variants, its own stock_quantity is ignored. The product is in
 * stock if ANY active variant has stock_quantity > 0, and each variant is available only if
 * it is active with stock > 0.
 */

interface StockProduct {
  has_variants: boolean
  stock_quantity: number
}

interface StockVariant {
  is_active: boolean
  stock_quantity: number
  option_values: Record<string, string> | null
}

/** A variant can be bought: active with stock left. */
export function isVariantAvailable(variant: Pick<StockVariant, 'is_active' | 'stock_quantity'> | null | undefined): boolean {
  return !!variant && variant.is_active && variant.stock_quantity > 0
}

/** Units available for a cart line: the variant's stock, or the product's for products without variants. */
export function getItemStock(
  product: StockProduct,
  variant: Pick<StockVariant, 'is_active' | 'stock_quantity'> | null | undefined
): number {
  if (variant) return variant.is_active ? Math.max(0, variant.stock_quantity) : 0
  // A product with variants can't be bought without choosing one
  return product.has_variants ? 0 : Math.max(0, product.stock_quantity)
}

/** Whether a product can be bought at all, plus the total units across available variants. */
export function getVariantAvailability(product: StockProduct, variants: StockVariant[] = []) {
  if (!product.has_variants) {
    const stock = Math.max(0, product.stock_quantity)
    return { inStock: stock > 0, totalStock: stock, availableVariants: 0 }
  }
  const available = variants.filter(isVariantAvailable)
  return {
    inStock: available.length > 0,
    totalStock: available.reduce((sum, v) => sum + v.stock_quantity, 0),
    availableVariants: available.length,
  }
}

const normalize = (text: string) => text.trim().toLowerCase()

/**
 * A variant's value for an option. Keys are matched ignoring spaces and case, because older
 * variants were saved with untrimmed names ("Edition ") or a name that was later renamed
 * ("E" -> "Editions"). As a last resort the value is taken by position.
 */
export function getVariantOptionValue(
  optionValues: Record<string, string> | null | undefined,
  optionName: string,
  optionIndex = 0
): string | undefined {
  if (!optionValues) return undefined
  if (optionName in optionValues) return optionValues[optionName]
  const wanted = normalize(optionName)
  const key = Object.keys(optionValues).find((k) => normalize(k) === wanted)
  if (key !== undefined) return optionValues[key]
  return Object.values(optionValues)[optionIndex]
}

/** Does this variant match every selected option value? `optionNames` gives each option's position. */
export function variantMatches(
  variant: Pick<StockVariant, 'option_values'>,
  selections: Record<string, string>,
  optionNames: string[]
): boolean {
  return Object.entries(selections).every(([name, value]) => {
    const actual = getVariantOptionValue(variant.option_values, name, Math.max(0, optionNames.indexOf(name)))
    return actual !== undefined && normalize(actual) === normalize(value)
  })
}

/** Rebuild a variant's option_values keyed by the product's current option names (used when admin saves). */
export function normalizeOptionValues(optionValues: Record<string, string>, optionNames: string[]): Record<string, string> {
  return Object.fromEntries(
    optionNames.map((name, i) => [name.trim(), (getVariantOptionValue(optionValues, name, i) ?? '').trim()])
  )
}
