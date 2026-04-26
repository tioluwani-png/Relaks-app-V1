import { z } from 'zod'

// ==========================================
// User-related
// ==========================================
export const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional().nullable(),
  bio: z.string().max(150).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  editions_owned: z.array(z.string().min(1).max(50)).optional(),
})

// ==========================================
// Posts
// ==========================================
export const createPostSchema = z.object({
  image_url: z.string().url(),
  thumbnail_url: z.string().url().optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  edition: z.string().min(1).max(50).optional().nullable(),
  page_number: z.number().int().positive().optional().nullable(),
  is_public: z.boolean().default(true),
})

// ==========================================
// Comments
// ==========================================
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long (max 500 characters)').trim(),
  parent_id: z.string().uuid().optional().nullable(),
})

// ==========================================
// Blog Comments
// ==========================================
export const createBlogCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long (max 500 characters)').trim(),
  parent_id: z.string().uuid().optional().nullable(),
})

// ==========================================
// Blog Submissions
// ==========================================
export const createBlogSubmissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long (max 200 characters)').trim(),
  category: z.enum(['rant', 'story', 'inspiration', 'tips', 'personal-journey']),
  content: z.string().min(1, 'Content is required').max(5000, 'Content is too long (max 5000 characters)').trim(),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long').trim(),
  is_anonymous: z.boolean().default(false),
})

// ==========================================
// Journal
// ==========================================
export const journalEntrySchema = z.object({
  content: z.string().max(10000).optional().nullable(),
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional().nullable(),
  prompt_used: z.string().max(500).optional().nullable(),
})

// ==========================================
// Reports
// ==========================================
export const createReportSchema = z.object({
  type: z.enum(['post', 'comment', 'user']),
  target_id: z.string().uuid(),
  reason: z.enum([
    'spam',
    'harassment',
    'inappropriate_content',
    'hate_speech',
    'violence',
    'copyright',
    'other',
  ]),
  details: z.string().max(1000).optional().nullable(),
})

// ==========================================
// AI Generation
// ==========================================
export const aiGenerateSchema = z.object({
  prompt: z.string().min(3, 'Prompt is too short').max(200, 'Prompt is too long').trim(),
  style: z.enum(['mandala', 'floral', 'animals', 'abstract', 'portrait', 'landscape']),
  complexity: z.enum(['simple', 'medium', 'detailed']),
})

export const photoToColoringSchema = z.object({
  complexity: z.enum(['simple', 'medium', 'detailed']).default('medium'),
})

// ==========================================
// Payments
// ==========================================
export const initializePaymentSchema = z.object({
  type: z.enum(['single', 'bundle', 'unlimited', 'ai_starter', 'ai_popular', 'ai_pro']),
  pageId: z.string().uuid().optional(),
})

export const verifyPaymentSchema = z.object({
  reference: z.string().min(5).max(100),
})

// ==========================================
// Search
// ==========================================
export const searchSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100),
  type: z.enum(['all', 'users', 'posts', 'pages']).default('all'),
})

// ==========================================
// Utility: validate and return typed data
// ==========================================
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  error: string
} {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues = result.error.issues
  const firstIssue = issues[0]
  return {
    success: false,
    error: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input',
  }
}
