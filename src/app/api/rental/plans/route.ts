import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: plans, error } = await supabase
      .from('rental_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[rental/plans] Error:', error)
      return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })
    }

    return NextResponse.json(plans)
  } catch (error) {
    console.error('[rental/plans] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
