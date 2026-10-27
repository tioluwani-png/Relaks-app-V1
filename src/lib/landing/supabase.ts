import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cookie-less service client so landing pages stay statically cacheable.
// Never import this file from client code.
export function createLandingClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export const ONE_HOUR = 60 * 60
