import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createReportSchema, validate } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(createReportSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { type, target_id, reason, details } = validation.data

    // Check if user already reported this
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('type', type)
      .eq('target_id', target_id)
      .single()

    if (existingReport) {
      return NextResponse.json({ error: 'You already reported this content' }, { status: 400 })
    }

    // Create report
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        type,
        target_id,
        reason,
        details: details || null,
      } as never)

    if (error) {
      // If table doesn't exist, create it first (for development)
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Reports table not set up' }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Report submitted successfully' })
  } catch (error) {
    console.error('Error submitting report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
