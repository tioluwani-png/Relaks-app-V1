import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
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

    // Check if admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, admin_notes } = body as { status?: string; admin_notes?: string }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "approved" or "rejected".' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data: submission, error } = await supabase
      .from('blog_submissions')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error updating blog submission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
