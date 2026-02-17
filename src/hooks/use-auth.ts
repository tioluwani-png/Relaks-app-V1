'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { User as DBUser } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<DBUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (e) {
      console.error('Failed to create Supabase client:', e)
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const getUser = async () => {
      try {
        // Use getSession() first - it reads from storage and auto-refreshes expired tokens
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (isMounted) setProfile(profile)
        }
      } catch (error) {
        // Ignore aborted requests
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Error fetching user:', error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (isMounted) setProfile(profile)
          } catch {
            // Ignore errors
          }
        } else {
          setProfile(null)
        }

        setIsLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (!user || !supabase) return

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profile)
  }

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
  }
}
