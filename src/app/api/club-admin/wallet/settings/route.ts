import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getReadingClubSplit, updateReadingClubSplit } from '@/lib/wallet'

export async function GET() {
  try {
    // Auth check - admin or partner
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role (admin, super_admin, or partner)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = (userData as { role: string }).role
    if (!['admin', 'super_admin', 'partner'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()
    const split = await getReadingClubSplit(adminSupabase)

    return NextResponse.json(split)
  } catch (error) {
    console.error('[club-admin/wallet/settings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  relaks_percent: z.number().min(0).max(100),
  partner_percent: z.number().min(0).max(100),
})

export async function PATCH(request: NextRequest) {
  try {
    // Auth check - admin only
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role - partners CANNOT update settings
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = (userData as { role: string }).role
    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { relaks_percent, partner_percent } = validation.data

    // Validate they add up to 100
    if (relaks_percent + partner_percent !== 100) {
      return NextResponse.json({ error: 'Percentages must add up to 100' }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()
    const result = await updateReadingClubSplit(adminSupabase, relaks_percent, partner_percent, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, relaks_percent, partner_percent })
  } catch (error) {
    console.error('[club-admin/wallet/settings] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
