import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateWalletBalance, getDateRangeForPeriod, getReadingClubSplit, calculateMonthlySummary } from '@/lib/wallet'
import type { WalletTransaction } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    // Auth check - admin or partner
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role (admin, super_admin, or partner)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = (userData as { role: string }).role
    if (!['admin', 'super_admin', 'partner'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'month') as 'week' | 'month' | 'all'
    const summaryMonth = searchParams.get('month') // Format: "2024-01" for monthly summary

    const adminSupabase = await createAdminClient()

    // Build query
    let query = adminSupabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet', 'reading_club')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    // Apply date filter
    const { start } = getDateRangeForPeriod(period)
    if (start) {
      query = query.gte('created_at', start.toISOString())
    }

    const { data: transactionsData, error: txError } = await query

    if (txError) {
      console.error('[club-admin/wallet] Transactions query error:', txError)
      return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
    }

    const transactions = (transactionsData || []) as unknown as WalletTransaction[]

    // Calculate balances (need ALL non-cancelled transactions for accurate balance)
    const { data: allTxData } = await adminSupabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet', 'reading_club')
      .neq('status', 'cancelled')

    const allTransactions = (allTxData || []) as unknown as WalletTransaction[]
    const balance = calculateWalletBalance(allTransactions)

    // Get profit split settings
    const split = await getReadingClubSplit(adminSupabase)

    // Calculate monthly summary if requested
    let monthlySummary = null
    if (summaryMonth) {
      monthlySummary = calculateMonthlySummary(allTransactions, summaryMonth, split)
    }

    return NextResponse.json({
      pending: balance.pending,
      available: balance.available,
      transactions,
      period,
      split,
      monthlySummary,
      isAdmin: ['admin', 'super_admin'].includes(userRole),
    })
  } catch (error) {
    console.error('[club-admin/wallet] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
