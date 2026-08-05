/**
 * RENTAL PAYMENTS ONLY
 *
 * This route handles rental subscription payments.
 * Never touch users.credits, credit_transactions, or credit_bundles.
 * Rentals have their own tables: rental_subscriptions, rental_payments, rental_subscription_books.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendRentalConfirmationEmail, sendNewOrderAlertEmail, sendStockFailureAlertEmail, sendStockFailureCustomerEmail } from '@/lib/email'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

const verifySchema = z.object({
  reference: z.string().min(10).max(100),
  subscriptionId: z.string().uuid(),
})

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    authorization: {
      authorization_code: string
    }
    customer: {
      email: string
    }
    metadata: Record<string, unknown>
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[rental/payments/verify] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate body
    const body = await request.json()
    const validation = verifySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { reference, subscriptionId } = validation.data

    // 3. Use admin client for all writes
    const adminSupabase = await createAdminClient()

    // 4. Duplicate check - reference already processed
    const { data: existingPayment } = await adminSupabase
      .from('rental_payments')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPayment) {
      console.log('[rental/payments/verify] Duplicate reference:', reference)
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // 5. Load subscription with plan (must belong to user, status pending_payment)
    const { data: subscriptionData, error: subError } = await adminSupabase
      .from('rental_subscriptions')
      .select(`
        *,
        plan:rental_plans(*)
      `)
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .eq('status', 'pending_payment')
      .single()

    if (subError || !subscriptionData) {
      console.error('[rental/payments/verify] Subscription not found:', {
        subscriptionId,
        userId: user.id,
        error: subError,
      })
      return NextResponse.json(
        { error: 'Subscription not found or already processed' },
        { status: 404 }
      )
    }

    // Type assertion for subscription with nested plan
    const subscription = subscriptionData as unknown as {
      id: string
      user_id: string
      plan_id: string
      status: string
      delivery_address: string
      delivery_lga: string
      delivery_phone: string
      plan: {
        id: string
        price_naira: number
        duration_days: number
        name: string
        swap_frequency: string
      }
    }

    const plan = subscription.plan
    const expectedAmountKobo = plan.price_naira * 100

    // 6. Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    if (!paystackResponse.ok) {
      console.error('[rental/payments/verify] Paystack API error:', paystackResponse.status)
      return NextResponse.json(
        { error: 'Failed to verify payment with Paystack' },
        { status: 502 }
      )
    }

    const paystackData: PaystackVerifyResponse = await paystackResponse.json()

    // 7. Require success and correct amount
    if (!paystackData.status || paystackData.data.status !== 'success') {
      console.log('[rental/payments/verify] Payment not successful:', {
        reference,
        status: paystackData.data?.status,
      })
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      )
    }

    if (paystackData.data.amount !== expectedAmountKobo) {
      console.error('[rental/payments/verify] Amount mismatch:', {
        reference,
        userId: user.id,
        expected: expectedAmountKobo,
        received: paystackData.data.amount,
      })
      return NextResponse.json(
        { error: 'Payment amount mismatch. Please contact support.' },
        { status: 400 }
      )
    }

    // 8. Store payment row
    const { error: paymentError } = await adminSupabase
      .from('rental_payments')
      .insert({
        user_id: user.id,
        subscription_id: subscriptionId,
        plan_id: plan.id,
        amount_naira: plan.price_naira,
        paystack_reference: reference,
        paystack_status: 'success',
        authorization_code: paystackData.data.authorization?.authorization_code || null,
      } as never)

    if (paymentError) {
      // Check for duplicate key (already processed by webhook)
      if (paymentError.code === '23505') {
        console.log('[rental/payments/verify] Race condition - webhook already processed')
        return NextResponse.json({ success: true, alreadyProcessed: true })
      }
      console.error('[rental/payments/verify] Payment insert error:', paymentError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    // 9. Update subscription: status active, set dates
    const now = new Date()
    const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)

    const { error: updateError } = await adminSupabase
      .from('rental_subscriptions')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      } as never)
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('[rental/payments/verify] Subscription update error:', updateError)
      // Payment recorded, but status update failed - manual intervention needed
      return NextResponse.json(
        { error: 'Payment recorded but status update failed. Contact support.' },
        { status: 500 }
      )
    }

    // 10. Atomic decrement of available_copies for each book
    // The key is using .gt('available_copies', 0) to ensure we only update if stock exists
    // and checking the result to see if the row was actually updated
    const { data: subscriptionBooksData } = await adminSupabase
      .from('rental_subscription_books')
      .select('book_id')
      .eq('subscription_id', subscriptionId)

    const subscriptionBooks = (subscriptionBooksData || []) as { book_id: string }[]
    const failedBooks: string[] = []
    const decrementedBooks: string[] = []

    if (subscriptionBooks.length > 0) {
      for (const { book_id } of subscriptionBooks) {
        // First, get current stock
        const { data: currentBook } = await adminSupabase
          .from('books')
          .select('id, title, available_copies')
          .eq('id', book_id)
          .single()

        const book = currentBook as { id: string; title: string; available_copies: number } | null

        if (!book || book.available_copies <= 0) {
          // Already out of stock
          failedBooks.push(book?.title || book_id)
          continue
        }

        // Atomic update: only succeeds if available_copies > 0
        // The WHERE clause makes this atomic - the row won't match if another request decremented first
        const { data: updatedBook, error: updateError } = await adminSupabase
          .from('books')
          .update({ available_copies: book.available_copies - 1 } as never)
          .eq('id', book_id)
          .eq('available_copies', book.available_copies) // Optimistic lock - only update if value unchanged
          .select('id')

        const updated = updatedBook as { id: string }[] | null

        if (updateError || !updated || updated.length === 0) {
          // Race condition: stock changed between read and write, or went to 0
          // Retry once with fresh read
          const { data: retryBook } = await adminSupabase
            .from('books')
            .select('id, title, available_copies')
            .eq('id', book_id)
            .single()

          const retry = retryBook as { id: string; title: string; available_copies: number } | null

          if (!retry || retry.available_copies <= 0) {
            failedBooks.push(retry?.title || book_id)
          } else {
            // Retry the decrement
            const { data: retryUpdate } = await adminSupabase
              .from('books')
              .update({ available_copies: retry.available_copies - 1 } as never)
              .eq('id', book_id)
              .eq('available_copies', retry.available_copies)
              .select('id')

            if (!retryUpdate || (retryUpdate as { id: string }[]).length === 0) {
              failedBooks.push(retry.title)
            } else {
              decrementedBooks.push(book_id)
            }
          }
        } else {
          decrementedBooks.push(book_id)
        }
      }
    }

    // 10b. Handle stock failure - someone else got the last copy
    if (failedBooks.length > 0) {
      console.error('[rental/payments/verify] Stock failure:', {
        reference,
        subscriptionId,
        userId: user.id,
        failedBooks,
        decrementedBooks,
      })

      // Rollback: re-increment any books we successfully decremented
      for (const book_id of decrementedBooks) {
        const { data: bookToRollback } = await adminSupabase
          .from('books')
          .select('available_copies, total_copies')
          .eq('id', book_id)
          .single()

        const rollbackBook = bookToRollback as { available_copies: number; total_copies: number } | null
        if (rollbackBook && rollbackBook.available_copies < rollbackBook.total_copies) {
          await adminSupabase
            .from('books')
            .update({ available_copies: rollbackBook.available_copies + 1 } as never)
            .eq('id', book_id)
        }
      }

      // Mark subscription for refund
      await adminSupabase
        .from('rental_subscriptions')
        .update({ status: 'cancelled' } as never)
        .eq('id', subscriptionId)

      // Update payment as needing refund
      await adminSupabase
        .from('rental_payments')
        .update({ paystack_status: 'refund_required' } as never)
        .eq('paystack_reference', reference)

      // Send alert to ops
      try {
        await sendStockFailureAlertEmail(
          subscriptionId,
          reference,
          failedBooks,
          plan.price_naira
        )
      } catch (e) {
        console.error('[rental/payments/verify] Stock alert email error:', e)
      }

      // Send apology to customer
      try {
        const { data: userProfileData } = await adminSupabase
          .from('users')
          .select('email, username, display_name')
          .eq('id', user.id)
          .single()
        const userProfile = userProfileData as { email: string; username: string; display_name: string | null } | null

        if (userProfile) {
          await sendStockFailureCustomerEmail(
            userProfile.email,
            userProfile.display_name || userProfile.username,
            failedBooks
          )
        }
      } catch (e) {
        console.error('[rental/payments/verify] Customer apology email error:', e)
      }

      return NextResponse.json({
        success: false,
        error: 'Some books are no longer available',
        unavailableBooks: failedBooks,
        refundPending: true,
      }, { status: 409 })
    }

    // 11. Send emails (each wrapped in try/catch - never fail payment)
    // Fetch data needed for both emails
    const { data: userProfileData } = await adminSupabase
      .from('users')
      .select('email, username, display_name')
      .eq('id', user.id)
      .single()

    const userProfile = userProfileData as { email: string; username: string; display_name: string | null } | null

    const { data: emailBooksData } = await adminSupabase
      .from('rental_subscription_books')
      .select(`
        book:books(id, title, author, cover_url)
      `)
      .eq('subscription_id', subscriptionId)

    type BookWithBook = { book: { id: string; title: string; author: string; cover_url: string | null } | null }
    const booksData = (emailBooksData || []) as BookWithBook[]

    // 11a. Customer confirmation email
    try {
      if (userProfile && booksData.length > 0) {
        const books = booksData
          .map((b) => b.book)
          .filter((b): b is { id: string; title: string; author: string; cover_url: string | null } => b !== null)

        await sendRentalConfirmationEmail(
          userProfile.email,
          userProfile.display_name || userProfile.username,
          plan.name,
          books,
          subscription.delivery_address,
          subscription.delivery_lga,
          expiresAt.toISOString(),
          plan.swap_frequency as 'monthly' | 'end_of_term'
        )
      }
    } catch (emailError) {
      console.error('[rental/payments/verify] Customer email error:', emailError)
    }

    // 11b. Ops alert email
    try {
      const bookTitles = booksData
        .map((b) => b.book?.title)
        .filter((t): t is string => !!t)

      await sendNewOrderAlertEmail(
        subscriptionId,
        userProfile?.display_name || userProfile?.username || 'Customer',
        userProfile?.username || 'unknown',
        subscription.delivery_phone,
        subscription.delivery_address,
        subscription.delivery_lga,
        plan.name,
        bookTitles,
        plan.price_naira,
        reference
      )
    } catch (opsEmailError) {
      console.error('[rental/payments/verify] Ops email error:', opsEmailError)
    }

    // 12. Return success
    console.log('[rental/payments/verify] Payment verified:', {
      reference,
      subscriptionId,
      userId: user.id,
      amount: plan.price_naira,
    })

    return NextResponse.json({
      success: true,
      subscriptionId,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[rental/payments/verify] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
