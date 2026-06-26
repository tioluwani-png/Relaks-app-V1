import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initializePayment, generateReference } from '@/lib/paystack'

// POST - Initialize payment for an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is already paid
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order is already processed' }, { status: 400 })
    }

    // Generate payment reference
    const reference = generateReference()

    // Update order with payment reference
    const { error: updateError } = await supabase
      .from('rental_orders')
      .update({ payment_reference: reference } as never)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Get callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${baseUrl}/payment/rental/callback`

    // Initialize Paystack payment
    const paystackResponse = await initializePayment(
      order.email,
      order.total, // Already in kobo
      reference,
      {
        order_id: id,
        type: 'rental',
        user_id: user.id,
      },
      callbackUrl
    )

    if (!paystackResponse.status) {
      return NextResponse.json(
        { error: paystackResponse.message || 'Payment initialization failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      authorization_url: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
    })
  } catch (error) {
    console.error('Error initializing payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
