import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { confirmTransactions, recordPayout, recordAdjustment } from '@/lib/wallet'

const actionSchema = z.object({
  action: z.enum(['confirm', 'payout', 'adjustment']),
  transactionIds: z.array(z.string().uuid()).optional(),
  amount: z.number().positive().optional(),
  direction: z.enum(['credit', 'debit']).optional(),
  note: z.string().min(1).max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Auth check - admin only
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = (userData as { role: string }).role
    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = actionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { action, transactionIds, amount, direction, note } = validation.data
    const adminSupabase = await createAdminClient()

    switch (action) {
      case 'confirm': {
        if (!transactionIds || transactionIds.length === 0) {
          return NextResponse.json({ error: 'No transactions specified' }, { status: 400 })
        }

        const result = await confirmTransactions(adminSupabase, transactionIds, user.id)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, confirmed: result.count })
      }

      case 'payout': {
        if (!amount || !note) {
          return NextResponse.json({ error: 'Amount and note required for payout' }, { status: 400 })
        }

        const result = await recordPayout(adminSupabase, 'shop', amount, note, user.id)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      }

      case 'adjustment': {
        if (!amount || !direction || !note) {
          return NextResponse.json({ error: 'Amount, direction, and note required for adjustment' }, { status: 400 })
        }

        const result = await recordAdjustment(adminSupabase, 'shop', amount, direction, note, user.id)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[admin/wallet/transactions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
