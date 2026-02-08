import { format, parseISO, differenceInDays, subDays } from 'date-fns'

export function calculateStreak(
  lastJournalDate: string | null,
  currentStreak: number,
  hasEntryToday: boolean
): { streak: number; shouldReset: boolean; shouldIncrement: boolean } {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // No previous journal entries
  if (!lastJournalDate) {
    return {
      streak: hasEntryToday ? 1 : 0,
      shouldReset: false,
      shouldIncrement: hasEntryToday,
    }
  }

  const lastDate = parseISO(lastJournalDate)
  const daysDiff = differenceInDays(new Date(), lastDate)

  // Journaled today already
  if (lastJournalDate === today) {
    return {
      streak: currentStreak,
      shouldReset: false,
      shouldIncrement: false,
    }
  }

  // Journaled yesterday - continue streak
  if (lastJournalDate === yesterday || daysDiff === 1) {
    return {
      streak: hasEntryToday ? currentStreak + 1 : currentStreak,
      shouldReset: false,
      shouldIncrement: hasEntryToday,
    }
  }

  // More than 1 day gap - reset streak
  if (daysDiff > 1) {
    return {
      streak: hasEntryToday ? 1 : 0,
      shouldReset: true,
      shouldIncrement: hasEntryToday,
    }
  }

  return {
    streak: currentStreak,
    shouldReset: false,
    shouldIncrement: false,
  }
}

export function getStreakMilestone(streak: number): string | null {
  const milestones = [7, 14, 30, 60, 100, 365]
  if (milestones.includes(streak)) {
    return `${streak} day streak!`
  }
  return null
}

export const journalPrompts = [
  "What colors bring you peace? Why do you think that is?",
  "Describe a moment today when you felt truly present.",
  "What are three things you're grateful for right now?",
  "How did coloring make you feel today?",
  "What patterns or images are you drawn to lately?",
  "Describe your ideal relaxation space.",
  "What emotions came up during your coloring session?",
  "What would you tell your younger self about self-care?",
  "What small joy did you experience today?",
  "How do you want to feel by the end of this week?",
]

export function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  )
  return journalPrompts[dayOfYear % journalPrompts.length]
}
