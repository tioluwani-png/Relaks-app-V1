'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BlogViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('increment_blog_view' as never, { post_id: postId } as never)
  }, [postId])

  return null
}
