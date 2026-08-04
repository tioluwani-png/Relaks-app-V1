import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscriptions, error } = await supabase
      .from('rental_subscriptions')
      .select(`
        *,
        plan:rental_plans(*),
        books:rental_subscription_books(
          *,
          book:rental_books(*)
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[rental/subscriptions] Error:', error)
      return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
    }

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('[rental/subscriptions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
