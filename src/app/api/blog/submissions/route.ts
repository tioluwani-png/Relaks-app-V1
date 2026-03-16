import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBlogSubmissionSchema, validate } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(createBlogSubmissionSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, category, content, display_name, is_anonymous } = validation.data

    const { data: submission, error } = await supabase
      .from('blog_submissions')
      .insert({
        user_id: user.id,
        title,
        category,
        content,
        display_name,
        is_anonymous,
      } as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error('Error creating blog submission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()

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

    const { data: submissions, error } = await supabase
      .from('blog_submissions')
      .select(`
        *,
        user:users!blog_submissions_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ submissions: submissions || [] })
  } catch (error) {
    console.error('Error fetching blog submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
