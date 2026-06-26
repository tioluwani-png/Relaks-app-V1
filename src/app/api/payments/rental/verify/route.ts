import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment } from '@/lib/paystack'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify with Paystack
    const paystackResponse = await verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      return NextResponse.json({
        status: 'failed',
        message: 'Payment was not successful',
      })
    }

    // Find the order by payment reference
    const { data: order, error: orderError } = await supabase
      .from('rental_orders')
      .select('id, user_id, status')
      .eq('payment_reference', reference)
      .single()

    if (orderError || !order) {
      return NextResponse.json({
        status: 'failed',
        message: 'Order not found',
      }, { status: 404 })
    }

    // Cast to proper type
    const orderTyped = order as { id: string; user_id: string; status: string }

    // Verify user owns this order
    if (orderTyped.user_id !== user.id) {
      return NextResponse.json({
        status: 'failed',
        message: 'Unauthorized',
      }, { status: 403 })
    }

    // If already processed, just return success
    if (orderTyped.status !== 'pending') {
      return NextResponse.json({
        status: 'success',
        message: 'Order already processed',
        order_id: orderTyped.id,
      })
    }

    // Update order status to paid
    const { error: updateError } = await supabase
      .from('rental_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      } as never)
      .eq('id', orderTyped.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json({
        status: 'failed',
        message: 'Failed to update order status',
      }, { status: 500 })
    }

    // Clear the user's cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified successfully',
      order_id: orderTyped.id,
    })
  } catch (error) {
    console.error('Error verifying rental payment:', error)
    return NextResponse.json({
      status: 'failed',
      message: 'An error occurred while verifying payment',
    }, { status: 500 })
  }
}
