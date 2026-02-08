import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, username } = body

    if (!userId || !email || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient()

    const { error } = await supabase.from('users').insert({
      id: userId,
      email: email,
      username: username.toLowerCase(),
    } as never)

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
