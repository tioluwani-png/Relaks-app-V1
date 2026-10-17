import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeNigerianPhone } from '@/lib/shop/config'

// GET - Fetch active distributors (public)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('distributors')
      .select('id, city, name, whatsapp_number')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[distributors] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch distributors' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[distributors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create distributor (admin only)
const createSchema = z.object({
  city: z.string().min(1).max(100).trim(),
  name: z.string().min(1).max(100).trim(),
  whatsapp_number: z.string().min(10).max(20),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional(),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validation = createSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { city, name, whatsapp_number, is_active, sort_order } = validation.data

    // Normalize phone number
    const normalizedPhone = normalizeNigerianPhone(whatsapp_number)
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid Nigerian phone number. Use format like 09033662304 or +2349033662304' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Get next sort_order if not provided
    let finalSortOrder = sort_order
    if (finalSortOrder === undefined) {
      const { data: maxOrder } = await adminSupabase
        .from('distributors')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      finalSortOrder = ((maxOrder as { sort_order: number } | null)?.sort_order ?? 0) + 1
    }

    const { data, error } = await adminSupabase
      .from('distributors')
      .insert({
        city,
        name,
        whatsapp_number: normalizedPhone,
        is_active,
        sort_order: finalSortOrder,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('[distributors] Create error:', error)
      return NextResponse.json({ error: 'Failed to create distributor' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[distributors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
