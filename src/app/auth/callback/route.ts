import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // If no profile, create one (for OAuth users)
      if (!profile) {
        const email = data.user.email || ''
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') +
          Math.random().toString(36).substring(2, 6)

        await supabase.from('users').insert({
          id: data.user.id,
          email: email,
          username: username,
          display_name: data.user.user_metadata?.full_name || null,
          avatar_url: data.user.user_metadata?.avatar_url || null,
        } as never)

        // Redirect to onboarding for new users
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
