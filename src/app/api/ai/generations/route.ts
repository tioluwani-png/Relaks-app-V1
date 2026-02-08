import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: generations, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user's AI credits
    const { data: userData } = await supabase
      .from('users')
      .select('ai_credits')
      .eq('id', user.id)
      .single()

    const userDataTyped = userData as { ai_credits: number } | null

    return NextResponse.json({
      generations: generations || [],
      aiCredits: userDataTyped?.ai_credits || 0,
    })
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
