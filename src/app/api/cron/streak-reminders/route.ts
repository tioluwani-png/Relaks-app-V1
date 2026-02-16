import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendStreakReminderEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Find users with an active streak who haven't journaled today
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, username, journal_streak, last_journal_date')
    .gt('journal_streak', 0)
    .neq('last_journal_date', today)
    .returns<{ id: string; email: string; username: string; journal_streak: number; last_journal_date: string | null }[]>()

  if (error) {
    console.error('Streak reminder query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ message: 'No reminders needed', sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const user of users) {
    if (!user.email) continue

    const result = await sendStreakReminderEmail(
      user.email,
      user.username || 'there',
      user.journal_streak
    )

    if (result.success) {
      sent++
    } else {
      failed++
    }
  }

  console.log(`Streak reminders: ${sent} sent, ${failed} failed out of ${users.length} users`)

  return NextResponse.json({
    message: 'Streak reminders processed',
    total: users.length,
    sent,
    failed,
  })
}
