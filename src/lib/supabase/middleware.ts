import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_PATHS = ['/feed', '/discover', '/create', '/journal', '/profile', '/notifications', '/search', '/references', '/color', '/payment']

// Routes that require admin role
const ADMIN_PATHS = ['/admin']

// Auth pages (redirect to feed if already authenticated)
const AUTH_PATHS = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route is protected
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    pathname.startsWith(path)
  )

  const isAdminPath = ADMIN_PATHS.some(path =>
    pathname.startsWith(path)
  )

  // Protected routes - redirect to login if not authenticated
  if ((isProtectedPath || isAdminPath) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // For authenticated users on protected routes, check if banned
  if (user && (isProtectedPath || isAdminPath)) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_banned, role')
      .eq('id', user.id)
      .single()

    const userProfile = profile as { is_banned: boolean; role: string } | null

    // Check if user is banned
    if (userProfile?.is_banned) {
      // Sign out banned users
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Admin routes - verify admin role
    if (isAdminPath) {
      const adminRoles = ['moderator', 'admin', 'super_admin']
      if (!userProfile || !adminRoles.includes(userProfile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = '/feed'
        return NextResponse.redirect(url)
      }
    }
  }

  // Auth routes - redirect to feed if already authenticated
  const isAuthPath = AUTH_PATHS.some(path =>
    pathname === path
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
