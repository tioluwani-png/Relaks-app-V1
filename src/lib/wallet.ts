import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WalletType,
  WalletTransactionType,
  WalletSourceType,
  WalletTransaction,
  WalletBalance,
  ReadingClubSplitSetting,
  MonthlySummary,
} from '@/types/database'

/**
 * Create a wallet transaction entry
 * Uses upsert with paystack_reference as conflict key for idempotency
 */
export async function createWalletTransaction(
  supabase: SupabaseClient,
  params: {
    wallet: WalletType
    type: WalletTransactionType
    amount: number
    direction: 'credit' | 'debit'
    sourceType: WalletSourceType | null
    sourceId: string | null
    paystackReference: string | null
    note?: string
    category?: string
    createdBy?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('wallet_transactions').upsert(
      {
        wallet: params.wallet,
        type: params.type,
        amount_naira: params.amount,
        direction: params.direction,
        status: 'pending',
        source_type: params.sourceType,
        source_id: params.sourceId,
        paystack_reference: params.paystackReference,
        note: params.note || null,
        category: params.category || null,
        created_by: params.createdBy || null,
      } as never,
      {
        onConflict: 'paystack_reference',
        ignoreDuplicates: true,
      }
    )

    if (error) {
      console.error('[createWalletTransaction] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[createWalletTransaction] Exception:', error)
    return { success: false, error: 'Failed to create wallet transaction' }
  }
}

/**
 * Calculate wallet balance from transactions
 * Pending = sum of pending credits
 * Available = available credits - available debits
 */
export function calculateWalletBalance(
  transactions: WalletTransaction[]
): WalletBalance {
  // Pending = sum of pending credits
  const pending = transactions
    .filter((t) => t.status === 'pending' && t.direction === 'credit')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  // Available credits
  const availableCredits = transactions
    .filter((t) => t.status === 'available' && t.direction === 'credit')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  // Available debits (payouts, expenses, reversals)
  const availableDebits = transactions
    .filter((t) => t.status === 'available' && t.direction === 'debit')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  const available = availableCredits - availableDebits

  return { pending, available }
}

/**
 * Confirm one or more transactions (pending → available)
 */
export async function confirmTransactions(
  supabase: SupabaseClient,
  transactionIds: string[],
  confirmedBy: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .update({
        status: 'available',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
      } as never)
      .in('id', transactionIds)
      .eq('status', 'pending')
      .select('id')

    if (error) {
      console.error('[confirmTransactions] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, count: data?.length || 0 }
  } catch (error) {
    console.error('[confirmTransactions] Exception:', error)
    return { success: false, error: 'Failed to confirm transactions' }
  }
}

/**
 * Cancel a transaction (mark as cancelled)
 */
export async function cancelTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  wallet: WalletType
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('wallet_transactions')
      .update({ status: 'cancelled' } as never)
      .eq('id', transactionId)
      .eq('wallet', wallet)
      .eq('status', 'pending')

    if (error) {
      console.error('[cancelTransaction] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[cancelTransaction] Exception:', error)
    return { success: false, error: 'Failed to cancel transaction' }
  }
}

/**
 * Record a payout (debit from wallet)
 */
export async function recordPayout(
  supabase: SupabaseClient,
  wallet: WalletType,
  amount: number,
  note: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('wallet_transactions').insert({
      wallet,
      type: 'payout',
      amount_naira: amount,
      direction: 'debit',
      status: 'available', // Payouts are immediately available (deducted)
      source_type: 'manual',
      source_id: null,
      paystack_reference: null,
      note,
      category: null,
      created_by: createdBy,
      confirmed_by: createdBy,
      confirmed_at: new Date().toISOString(),
    } as never)

    if (error) {
      console.error('[recordPayout] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[recordPayout] Exception:', error)
    return { success: false, error: 'Failed to record payout' }
  }
}

/**
 * Record an expense (debit from wallet)
 */
export async function recordExpense(
  supabase: SupabaseClient,
  wallet: WalletType,
  amount: number,
  category: string,
  note: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('wallet_transactions').insert({
      wallet,
      type: 'expense',
      amount_naira: amount,
      direction: 'debit',
      status: 'available', // Expenses are immediately deducted
      source_type: 'manual',
      source_id: null,
      paystack_reference: null,
      note,
      category,
      created_by: createdBy,
      confirmed_by: createdBy,
      confirmed_at: new Date().toISOString(),
    } as never)

    if (error) {
      console.error('[recordExpense] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[recordExpense] Exception:', error)
    return { success: false, error: 'Failed to record expense' }
  }
}

/**
 * Record a manual adjustment (credit or debit)
 */
export async function recordAdjustment(
  supabase: SupabaseClient,
  wallet: WalletType,
  amount: number,
  direction: 'credit' | 'debit',
  note: string,
  createdBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('wallet_transactions').insert({
      wallet,
      type: 'adjustment',
      amount_naira: amount,
      direction,
      status: 'available', // Adjustments are immediate
      source_type: 'manual',
      source_id: null,
      paystack_reference: null,
      note,
      category: null,
      created_by: createdBy,
      confirmed_by: createdBy,
      confirmed_at: new Date().toISOString(),
    } as never)

    if (error) {
      console.error('[recordAdjustment] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[recordAdjustment] Exception:', error)
    return { success: false, error: 'Failed to record adjustment' }
  }
}

/**
 * Get the reading club profit split setting
 */
export async function getReadingClubSplit(
  supabase: SupabaseClient
): Promise<ReadingClubSplitSetting> {
  const defaultSplit: ReadingClubSplitSetting = {
    relaks_percent: 50,
    partner_percent: 50,
  }

  try {
    const { data, error } = await supabase
      .from('wallet_settings')
      .select('setting_value')
      .eq('setting_key', 'reading_club_split')
      .single()

    if (error || !data) {
      return defaultSplit
    }

    const value = data.setting_value as ReadingClubSplitSetting
    return {
      relaks_percent: value.relaks_percent ?? 50,
      partner_percent: value.partner_percent ?? 50,
    }
  } catch {
    return defaultSplit
  }
}

/**
 * Update the reading club profit split
 */
export async function updateReadingClubSplit(
  supabase: SupabaseClient,
  relaksPercent: number,
  partnerPercent: number,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Validate percentages add up to 100
  if (relaksPercent + partnerPercent !== 100) {
    return { success: false, error: 'Percentages must add up to 100' }
  }

  if (relaksPercent < 0 || partnerPercent < 0) {
    return { success: false, error: 'Percentages cannot be negative' }
  }

  try {
    const { error } = await supabase
      .from('wallet_settings')
      .update({
        setting_value: {
          relaks_percent: relaksPercent,
          partner_percent: partnerPercent,
        },
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('setting_key', 'reading_club_split')

    if (error) {
      console.error('[updateReadingClubSplit] Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[updateReadingClubSplit] Exception:', error)
    return { success: false, error: 'Failed to update split' }
  }
}

/**
 * Calculate monthly summary for Reading Club wallet
 */
export function calculateMonthlySummary(
  transactions: WalletTransaction[],
  month: string, // Format: "2024-01"
  split: ReadingClubSplitSetting
): MonthlySummary {
  // Filter transactions for the month (available status only)
  const monthTransactions = transactions.filter((t) => {
    if (t.status !== 'available') return false
    const txMonth = t.created_at.substring(0, 7)
    return txMonth === month
  })

  // Revenue = all available credits (sales)
  const revenue = monthTransactions
    .filter((t) => t.direction === 'credit')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  // Expenses = all available debits that are expenses
  const expenses = monthTransactions
    .filter((t) => t.direction === 'debit' && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_naira, 0)

  const netProfit = revenue - expenses
  const relaksShare = Math.floor((netProfit * split.relaks_percent) / 100)
  const partnerShare = Math.floor((netProfit * split.partner_percent) / 100)

  return {
    month,
    revenue,
    expenses,
    netProfit,
    relaksShare,
    partnerShare,
  }
}

/**
 * Get date range for period filter
 */
export function getDateRangeForPeriod(
  period: 'week' | 'month' | 'all'
): { start: Date | null; end: Date } {
  const now = new Date()
  const end = now

  if (period === 'all') {
    return { start: null, end }
  }

  if (period === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return { start, end }
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end }
}
