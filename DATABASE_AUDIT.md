# Database Audit — Relaks Web App

> Generated: March 2026
> Purpose: Document every Supabase table the codebase expects

---

## Tables Overview (18 tables + 2 storage buckets)

| # | Table | Migration | Purpose |
|---|-------|-----------|---------|
| 1 | `users` | 001 | User profiles |
| 2 | `posts` | 001 | Feed posts (coloring uploads) |
| 3 | `likes` | 001 | Feed post likes (junction) |
| 4 | `comments` | 001 | Feed post comments |
| 5 | `follows` | 001 | User follow relationships |
| 6 | `journal_entries` | 001 | Daily journal entries |
| 7 | `saved_posts` | 001 | Bookmarked/saved posts |
| 8 | `coloring_pages` | 001 | Store coloring pages |
| 9 | `purchases` | 001 | Payment records |
| 10 | `ai_generations` | 001 | AI-generated coloring pages |
| 11 | `reference_images` | 001 | Edition reference gallery |
| 12 | `notifications` | 001 | In-app notifications |
| 13 | `reports` | 001 | Content reports |
| 14 | `blog_posts` | 005 | Blog articles |
| 15 | `blog_categories` | 005 | Blog category definitions |
| 16 | `blog_comments` | 006 | Blog post comments |
| 17 | `blog_comment_likes` | 006 | Blog comment likes (junction) |
| 18 | `blog_submissions` | 007 | User story submissions |

### Storage Buckets
- `posts` — Feed post images
- `avatars` — User profile photos

---

## Critical Tables for Likes & Comments

### `likes`
- **Type:** Junction table (composite PK)
- **Columns:** `user_id` (UUID, FK→users), `post_id` (UUID, FK→posts), `created_at`
- **Indexes:** `idx_likes_post`, `idx_likes_user`
- **Trigger:** `trigger_update_post_like_count` → updates `posts.like_count` and `users.total_likes_received`
- **RLS:** Anyone SELECT, auth users INSERT/DELETE own rows
- **Referenced by:** `src/app/api/posts/[id]/like/route.ts`, `src/components/feed/post-card.tsx`

### `comments`
- **Columns:** `id` (UUID PK), `post_id` (FK→posts), `user_id` (FK→users), `parent_id` (FK→comments, nullable), `content` (VARCHAR 500), `created_at`
- **Indexes:** `idx_comments_post`, `idx_comments_user`, `idx_comments_parent`
- **Trigger:** `trigger_update_post_comment_count` → updates `posts.comment_count`
- **RLS:** Anyone SELECT, auth users INSERT/UPDATE/DELETE own, admins DELETE any
- **Referenced by:** `src/app/api/posts/[id]/comments/route.ts`, `src/components/feed/post-detail.tsx`

### `blog_comments`
- **Columns:** `id` (UUID PK), `blog_post_id` (FK→blog_posts), `user_id` (FK→users), `parent_id` (FK→blog_comments, nullable), `content` (TEXT, 1-500 chars), `like_count` (INT default 0), `created_at`
- **Indexes:** `idx_blog_comments_post_id`, `idx_blog_comments_parent_id`, `idx_blog_comments_user_id`
- **RLS:** Anyone SELECT, auth users INSERT/DELETE own
- **Referenced by:** `src/app/api/blog/[slug]/comments/route.ts`, `src/components/blog/blog-comments.tsx`

### `blog_comment_likes`
- **Type:** Junction table (composite PK)
- **Columns:** `user_id` (FK→users), `comment_id` (FK→blog_comments), `created_at`
- **Trigger:** `on_blog_comment_like_change` → updates `blog_comments.like_count`
- **RLS:** Anyone SELECT, auth users INSERT/DELETE own
- **Referenced by:** `src/app/api/blog/comments/[id]/like/route.ts`, `src/components/blog/blog-comments.tsx`

---

## File → Table Reference Map

| File | Tables Used |
|------|------------|
| `src/app/api/posts/[id]/like/route.ts` | `likes` |
| `src/app/api/posts/[id]/comments/route.ts` | `comments`, `users` |
| `src/app/api/blog/[slug]/comments/route.ts` | `blog_posts`, `blog_comments`, `blog_comment_likes`, `users` |
| `src/app/api/blog/comments/[id]/like/route.ts` | `blog_comment_likes` |
| `src/app/api/blog/notify/route.ts` | `blog_posts`, `users` |
| `src/components/feed/post-card.tsx` | `likes` (via API) |
| `src/components/feed/post-detail.tsx` | `comments` (via API) |
| `src/components/blog/blog-comments.tsx` | `blog_comments`, `blog_comment_likes` (via API) |
| `src/hooks/use-posts.ts` | `posts`, `likes`, `saved_posts`, `users` |
| `src/hooks/use-auth.ts` | `users` |
| `src/app/api/feed/route.ts` | `posts`, `users`, `likes`, `saved_posts` |
