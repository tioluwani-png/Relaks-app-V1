import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isVerifiedForRental } from '@/lib/rental/verification'
import type { RentalPlan } from '@/types/database'

const createOrderSchema = z.object({
  planId: z.string().uuid(),
  bookIds: z.array(z.string().uuid()).min(1),
  deliveryLga: z.string().min(1).max(100),
  deliveryAddress: z.string().min(5).max(500),
  deliveryPhone: z.string().min(10).max(20),
})

// Type for book query result
interface BookRow {
  id: string
  title: string
  is_active: boolean
  available_copies: number
  manually_unavailable: boolean
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate body
    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { planId, bookIds, deliveryLga, deliveryAddress, deliveryPhone } = validation.data

    // 3. Check identity verification
    const isVerified = await isVerifiedForRental(user.id)
    if (!isVerified) {
      return NextResponse.json(
        { error: 'Identity verification required before renting' },
        { status: 403 }
      )
    }

    // 4. Use admin client for writes (RLS blocks client writes)
    const adminSupabase = await createAdminClient()

    // 5. Validate plan exists and is active
    const { data: planData, error: planError } = await adminSupabase
      .from('rental_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !planData) {
      return NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 400 })
    }

    // Type assertion for plan (tables not yet in generated types)
    const plan = planData as unknown as RentalPlan

    // 6. Validate book count matches plan
    if (bookIds.length !== plan.books_per_cycle) {
      return NextResponse.json(
        { error: `This plan requires exactly ${plan.books_per_cycle} books` },
        { status: 400 }
      )
    }

    // 7. Validate all books exist, are active, in stock, and not manually unavailable
    const { data: booksData, error: booksError } = await adminSupabase
      .from('books')
      .select('id, title, is_active, available_copies, manually_unavailable')
      .in('id', bookIds)

    if (booksError) {
      console.error('[rental/orders/create] Books query error:', booksError)
      return NextResponse.json({ error: 'Failed to validate books' }, { status: 500 })
    }

    // Type assertion for books
    const books = (booksData || []) as unknown as BookRow[]

    if (books.length !== bookIds.length) {
      return NextResponse.json({ error: 'One or more books not found' }, { status: 400 })
    }

    // Check for inactive books
    const inactiveBooks = books.filter((b) => !b.is_active)
    if (inactiveBooks.length > 0) {
      return NextResponse.json(
        {
          error: 'Some books are unavailable',
          unavailable: inactiveBooks.map((b) => b.title),
        },
        { status: 400 }
      )
    }

    // Check for out-of-stock books
    const outOfStockBooks = books.filter((b) => (b.available_copies ?? 0) <= 0)
    if (outOfStockBooks.length > 0) {
      return NextResponse.json(
        {
          error: 'Some books are currently out on loan',
          unavailable: outOfStockBooks.map((b) => b.title),
        },
        { status: 400 }
      )
    }

    // Check for manually unavailable books
    const manuallyUnavailable = books.filter((b) => b.manually_unavailable)
    if (manuallyUnavailable.length > 0) {
      return NextResponse.json(
        {
          error: 'Some books are temporarily unavailable',
          unavailable: manuallyUnavailable.map((b) => b.title),
        },
        { status: 400 }
      )
    }

    // 8. Check for existing pending subscription (prevent duplicates)
    const { data: existingPending } = await adminSupabase
      .from('rental_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending_payment')
      .single()

    const existingPendingTyped = existingPending as { id: string } | null

    if (existingPendingTyped) {
      // Cancel the old pending subscription
      await adminSupabase
        .from('rental_subscriptions')
        .update({ status: 'cancelled' } as never)
        .eq('id', existingPendingTyped.id)

      // Delete its books
      await adminSupabase
        .from('rental_subscription_books')
        .delete()
        .eq('subscription_id', existingPendingTyped.id)
    }

    // 9. Create subscription (pending_payment status)
    const { data: subscriptionData, error: subError } = await adminSupabase
      .from('rental_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'pending_payment',
        delivery_lga: deliveryLga,
        delivery_address: deliveryAddress,
        delivery_phone: deliveryPhone,
      } as never)
      .select('id')
      .single()

    if (subError || !subscriptionData) {
      console.error('[rental/orders/create] Subscription insert error:', subError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    const subscription = subscriptionData as { id: string }

    // 10. Create subscription_books entries
    const bookEntries = bookIds.map((bookId) => ({
      subscription_id: subscription.id,
      book_id: bookId,
    }))

    const { error: booksInsertError } = await adminSupabase
      .from('rental_subscription_books')
      .insert(bookEntries as never)

    if (booksInsertError) {
      console.error('[rental/orders/create] Books insert error:', booksInsertError)
      // Cleanup the subscription
      await adminSupabase
        .from('rental_subscriptions')
        .delete()
        .eq('id', subscription.id)

      return NextResponse.json({ error: 'Failed to save book selection' }, { status: 500 })
    }

    // 11. Return subscription ID for payment reference
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      planPrice: plan.price_naira,
    })
  } catch (error) {
    console.error('[rental/orders/create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
