import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { handleNewUserEmails } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    // Determine the correct redirect base URL
    let redirectBase: string
    if (isLocalEnv) {
      redirectBase = origin
    } else if (forwardedHost) {
      redirectBase = `https://${forwardedHost}`
    } else {
      redirectBase = origin
    }

    // Create a redirect response first so we can set cookies on it
    const redirectUrl = new URL(next, redirectBase)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

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

        // Send welcome email + add to Mailchimp (non-blocking)
        if (email) {
          handleNewUserEmails(email, username).catch(err =>
            console.error('New user email error:', err)
          )
        }

        // Redirect to onboarding for new users
        const onboardingUrl = new URL('/onboarding', redirectBase)
        const onboardingResponse = NextResponse.redirect(onboardingUrl)
        // Copy cookies from the original response to the onboarding redirect
        response.cookies.getAll().forEach(cookie => {
          onboardingResponse.cookies.set(cookie.name, cookie.value)
        })
        return onboardingResponse
      }

      // Existing user - redirect to feed (cookies already set on response)
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
