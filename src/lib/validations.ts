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
// Reading Club - Books
// ==========================================
export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title is too long').trim(),
  author: z.string().min(1, 'Author is required').max(200, 'Author name is too long').trim(),
  genre_id: z.string().uuid().optional().nullable(),
  description: z.string().max(5000, 'Description is too long').optional().nullable(),
  cover_url: z.string().url('Invalid cover URL').optional().nullable(),
  isbn: z.string().max(20).optional().nullable(),
  page_count: z.number().int().positive().optional().nullable(),
  published_year: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional().nullable(),
})

export const updateBookSchema = createBookSchema.partial()

// ==========================================
// Reading Club - Reading Status
// ==========================================
export const updateReadStatusSchema = z.object({
  status: z.enum(['want_to_read', 'reading', 'read', 'dnf']),
  rating: z.number().int().min(1).max(5).optional().nullable(),
})

// ==========================================
// Reading Club - Book Requests
// ==========================================
export const createBookRequestSchema = z.object({
  book_title: z.string().min(1, 'Book title is required').max(300, 'Title is too long').trim(),
  author: z.string().max(200, 'Author name is too long').optional().nullable(),
  reason: z.string().max(500, 'Reason is too long').optional().nullable(),
})

export const updateBookRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'fulfilled']),
  admin_notes: z.string().max(1000).optional().nullable(),
  fulfilled_book_id: z.string().uuid().optional().nullable(),
})

// ==========================================
// Reading Club - Reading Lists
// ==========================================
export const createReadingListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').trim(),
  description: z.string().max(1000, 'Description is too long').optional().nullable(),
  is_public: z.boolean().default(true),
})

export const updateReadingListSchema = createReadingListSchema.partial()

export const addBookToListSchema = z.object({
  book_id: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
})

// ==========================================
// Reading Club - Reviews
// ==========================================
export const createBookReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(5),
  title: z.string().max(200, 'Title is too long').optional().nullable(),
  body: z.string().min(10, 'Review must be at least 10 characters').max(5000, 'Review is too long').trim(),
  is_spoiler: z.boolean().default(false),
})

export const updateBookReviewSchema = createBookReviewSchema.partial()

// ==========================================
// Reading Club - Comments
// ==========================================
export const createBookCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long').trim(),
  parent_id: z.string().uuid().optional().nullable(),
})

// ==========================================
// Reading Club - Book Genres (Admin)
// ==========================================
export const createBookGenreSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#A855F7'),
  display_order: z.number().int().min(0).default(0),
})

export const updateBookGenreSchema = createBookGenreSchema.partial()

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
