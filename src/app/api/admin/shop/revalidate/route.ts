import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidateShop } from '@/lib/shop/revalidate'

/**
 * POST /api/admin/shop/revalidate
 * Called by admin after changes made directly from the browser (show/hide, delete),
 * so stock and visibility update on /shop, product pages and the homepage straight away.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  revalidateShop()
  return NextResponse.json({ revalidated: true })
}
