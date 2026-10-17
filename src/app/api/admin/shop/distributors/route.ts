import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch all distributors for admin (including inactive)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data, error } = await adminSupabase
      .from('distributors')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[admin/distributors] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch distributors' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[admin/distributors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
