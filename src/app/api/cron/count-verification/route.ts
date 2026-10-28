import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createAdminClient()
    const driftLog: { post_id: string; field: string; stored: number; actual: number }[] = []

    // Check like_count drift
    const { data: likeDriftData } = await supabase.rpc('check_like_count_drift')
    const likeDrift = likeDriftData as { post_id: string; stored_count: number; actual_count: number }[] | null
    if (likeDrift && likeDrift.length > 0) {
      for (const row of likeDrift) {
        driftLog.push({
          post_id: row.post_id,
          field: 'like_count',
          stored: row.stored_count,
          actual: row.actual_count,
        })
      }
    }

    // Check comment_count drift
    const { data: commentDriftData } = await supabase.rpc('check_comment_count_drift')
    const commentDrift = commentDriftData as { post_id: string; stored_count: number; actual_count: number }[] | null
    if (commentDrift && commentDrift.length > 0) {
      for (const row of commentDrift) {
        driftLog.push({
          post_id: row.post_id,
          field: 'comment_count',
          stored: row.stored_count,
          actual: row.actual_count,
        })
      }
    }

    // If drift found, fix it and log
    if (driftLog.length > 0) {
      console.error('[count-verification] DRIFT DETECTED:', JSON.stringify(driftLog))

      // Auto-fix by recalculating
      await supabase.rpc('fix_post_counts')

      return NextResponse.json({
        ok: false,
        drift_found: driftLog.length,
        drift: driftLog,
        action: 'auto-fixed',
      })
    }

    return NextResponse.json({ ok: true, drift_found: 0 })
  } catch (error) {
    console.error('[count-verification] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
