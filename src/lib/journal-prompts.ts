export type PromptCategory =
  | 'gratitude'
  | 'reflection'
  | 'creativity'
  | 'wellness'
  | 'relationships'
  | 'dreams'
  | 'coloring'

export interface JournalPrompt {
  id: string
  text: string
  category: PromptCategory
}

export const categoryLabels: Record<PromptCategory, string> = {
  gratitude: 'Gratitude',
  reflection: 'Self-Reflection',
  creativity: 'Creativity',
  wellness: 'Wellness',
  relationships: 'Relationships',
  dreams: 'Dreams & Intentions',
  coloring: 'Coloring',
}

export const categoryEmojis: Record<PromptCategory, string> = {
  gratitude: '\u{1F64F}',
  reflection: '\u{1FA9E}',
  creativity: '\u{1F3A8}',
  wellness: '\u{1F9D8}',
  relationships: '\u{1F49C}',
  dreams: '\u{2728}',
  coloring: '\u{1F58D}',
}

export const journalPrompts: JournalPrompt[] = [
  // Gratitude
  { id: 'g1', category: 'gratitude', text: "What's one small thing that made you smile today?" },
  { id: 'g2', category: 'gratitude', text: "Name three things you're grateful for right now, no matter how small." },
  { id: 'g3', category: 'gratitude', text: "What's a kindness someone showed you recently that you haven't forgotten?" },
  { id: 'g4', category: 'gratitude', text: "What part of your day would you want to relive?" },
  { id: 'g5', category: 'gratitude', text: "What's something about yourself you've learned to appreciate?" },
  { id: 'g6', category: 'gratitude', text: "Who made your life a little easier this week?" },
  { id: 'g7', category: 'gratitude', text: "What's a simple pleasure you enjoyed today?" },
  { id: 'g8', category: 'gratitude', text: "What's working well in your life right now?" },
  { id: 'g9', category: 'gratitude', text: "What's a compliment you received that stuck with you?" },
  { id: 'g10', category: 'gratitude', text: "What's one thing you're looking forward to tomorrow?" },

  // Self-Reflection
  { id: 'r1', category: 'reflection', text: "What would you tell your younger self about where you are now?" },
  { id: 'r2', category: 'reflection', text: "What's one thing you did today that your past self would be proud of?" },
  { id: 'r3', category: 'reflection', text: "What's a mistake that taught you something valuable?" },
  { id: 'r4', category: 'reflection', text: "What's a belief you've changed your mind about?" },
  { id: 'r5', category: 'reflection', text: "What's one small step you could take toward a goal you've been putting off?" },
  { id: 'r6', category: 'reflection', text: "What's draining your energy lately, and what could you do about it?" },
  { id: 'r7', category: 'reflection', text: "When did you last feel truly at peace? What were you doing?" },
  { id: 'r8', category: 'reflection', text: "What's something you need to forgive yourself for?" },
  { id: 'r9', category: 'reflection', text: "What would your life look like if you worried less about what others think?" },
  { id: 'r10', category: 'reflection', text: "What's a boundary you need to set or maintain?" },

  // Creativity
  { id: 'c1', category: 'creativity', text: "What colors are you drawn to today, and why do you think that is?" },
  { id: 'c2', category: 'creativity', text: "If you could create anything without fear of judgment, what would it be?" },
  { id: 'c3', category: 'creativity', text: "What's inspiring you creatively right now?" },
  { id: 'c4', category: 'creativity', text: "Describe a place (real or imagined) where you feel completely at peace." },
  { id: 'c5', category: 'creativity', text: "What's a creative project you've been wanting to start?" },
  { id: 'c6', category: 'creativity', text: "If your mood today were a color palette, what would it look like?" },
  { id: 'c7', category: 'creativity', text: "What does your ideal creative space look like?" },
  { id: 'c8', category: 'creativity', text: "What's a piece of art, music, or writing that moved you recently?" },
  { id: 'c9', category: 'creativity', text: "If you could master any creative skill overnight, what would it be?" },
  { id: 'c10', category: 'creativity', text: "What's something beautiful you noticed today?" },

  // Wellness
  { id: 'w1', category: 'wellness', text: "What's weighing on your mind right now? Write it out and let it go." },
  { id: 'w2', category: 'wellness', text: "What's one thing you can control today, and one thing you need to release?" },
  { id: 'w3', category: 'wellness', text: "How is your body feeling right now? Where are you holding tension?" },
  { id: 'w4', category: 'wellness', text: "What would make tomorrow easier than today?" },
  { id: 'w5', category: 'wellness', text: "What's one kind thing you could do for yourself today?" },
  { id: 'w6', category: 'wellness', text: "When did you last take a real break? How did it feel?" },
  { id: 'w7', category: 'wellness', text: "What helps you calm down when you're feeling overwhelmed?" },
  { id: 'w8', category: 'wellness', text: "What's a worry that turned out to be smaller than you expected?" },
  { id: 'w9', category: 'wellness', text: "If you could take one thing off your plate right now, what would it be?" },
  { id: 'w10', category: 'wellness', text: "What does rest look like for you?" },

  // Relationships
  { id: 'rel1', category: 'relationships', text: "Who do you need to reach out to that you've been thinking about?" },
  { id: 'rel2', category: 'relationships', text: "What's a quality you admire in someone close to you?" },
  { id: 'rel3', category: 'relationships', text: "How did you show up for someone recently?" },
  { id: 'rel4', category: 'relationships', text: "What's a conversation you've been avoiding? What would help you have it?" },
  { id: 'rel5', category: 'relationships', text: "Who makes you feel most like yourself?" },
  { id: 'rel6', category: 'relationships', text: "What's something you wish others understood about you?" },
  { id: 'rel7', category: 'relationships', text: "How can you be a better friend, partner, or family member this week?" },
  { id: 'rel8', category: 'relationships', text: "What's a relationship that has positively shaped who you are?" },
  { id: 'rel9', category: 'relationships', text: "Who do you need to thank?" },
  { id: 'rel10', category: 'relationships', text: "What does meaningful connection look like for you?" },

  // Dreams & Intentions
  { id: 'd1', category: 'dreams', text: "If money and time weren't factors, how would you spend your days?" },
  { id: 'd2', category: 'dreams', text: "What's one word you want to define this season of your life?" },
  { id: 'd3', category: 'dreams', text: "What does your ideal morning routine look like?" },
  { id: 'd4', category: 'dreams', text: "Where do you see yourself in 5 years? How does that feel?" },
  { id: 'd5', category: 'dreams', text: "What's a dream you've quietly held onto?" },
  { id: 'd6', category: 'dreams', text: "What would you do if you knew you couldn't fail?" },
  { id: 'd7', category: 'dreams', text: "What legacy do you want to leave?" },
  { id: 'd8', category: 'dreams', text: "What's something you want to experience before the year ends?" },
  { id: 'd9', category: 'dreams', text: "If today were your last, what would you regret not doing?" },
  { id: 'd10', category: 'dreams', text: "What intention do you want to set for tomorrow?" },

  // Coloring-Specific
  { id: 'col1', category: 'coloring', text: "What drew you to coloring today?" },
  { id: 'col2', category: 'coloring', text: "How did you feel before vs. after your last coloring session?" },
  { id: 'col3', category: 'coloring', text: "What's your favorite page you've colored recently, and why?" },
  { id: 'col4', category: 'coloring', text: "Do you prefer structured patterns or freeform designs? What does that say about you?" },
  { id: 'col5', category: 'coloring', text: "What music or sounds do you like while coloring?" },
  { id: 'col6', category: 'coloring', text: "What's a color combination you've discovered that you love?" },
  { id: 'col7', category: 'coloring', text: "How has coloring affected your stress levels or mood?" },
  { id: 'col8', category: 'coloring', text: "What would you like to color next?" },
  { id: 'col9', category: 'coloring', text: "Describe your perfect coloring setup — the space, the tools, the vibe." },
  { id: 'col10', category: 'coloring', text: "Has coloring taught you anything about patience or being present?" },
]

export function getPromptsByCategory(category: PromptCategory): JournalPrompt[] {
  return journalPrompts.filter(p => p.category === category)
}

export function getTodaysPrompt(): JournalPrompt {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  return journalPrompts[dayOfYear % journalPrompts.length]
}

export function getRandomPromptFromCategory(category: PromptCategory): JournalPrompt {
  const categoryPrompts = getPromptsByCategory(category)
  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)]
}

export function getRandomPrompt(): JournalPrompt {
  return journalPrompts[Math.floor(Math.random() * journalPrompts.length)]
}

export function getAllCategories(): PromptCategory[] {
  return Object.keys(categoryLabels) as PromptCategory[]
}
