# SQL Blocks — Run in Supabase SQL Editor

> Run each block SEPARATELY in order. Each block is self-contained.
> Includes DROP statements so you can re-run safely if tables exist but are broken.

---

## BLOCK 0: Check which tables already exist

Run this first to see what you have:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## BLOCK 1: Users Table

```sql
-- ============================================
-- USERS TABLE
-- ============================================

-- Custom enum types (skip if already exist)
DO $$ BEGIN
  CREATE TYPE edition AS ENUM ('lavender', 'pink', 'christmas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio VARCHAR(150),
  editions_owned edition[] DEFAULT '{}',
  free_pages_remaining INT DEFAULT 5,
  ai_credits INT DEFAULT 1,
  journal_streak INT DEFAULT 0,
  last_journal_date DATE,
  streak_freeze_available BOOLEAN DEFAULT TRUE,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  total_likes_received INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_type VARCHAR(20),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  role user_role DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  banned_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified) WHERE is_verified = true;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON users;
CREATE POLICY "Anyone can view profiles" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own safe fields" ON users;
CREATE POLICY "Users can update own safe fields" ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT role FROM users WHERE id = auth.uid())
    AND is_banned IS NOT DISTINCT FROM (SELECT is_banned FROM users WHERE id = auth.uid())
    AND free_pages_remaining IS NOT DISTINCT FROM (SELECT free_pages_remaining FROM users WHERE id = auth.uid())
    AND ai_credits IS NOT DISTINCT FROM (SELECT ai_credits FROM users WHERE id = auth.uid())
  );

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## BLOCK 2: Posts Table

```sql
-- ============================================
-- POSTS TABLE
-- ============================================

DROP TABLE IF EXISTS posts CASCADE;

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption VARCHAR(500),
  edition edition,
  page_number INT,
  is_public BOOLEAN DEFAULT TRUE,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_public ON posts(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;
CREATE POLICY "Anyone can view public posts" ON posts FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own posts" ON posts;
CREATE POLICY "Users can create own posts" ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any post" ON posts;
CREATE POLICY "Admins can delete any post" ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update any post" ON posts;
CREATE POLICY "Admins can update any post" ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );
```

---

## BLOCK 3: Likes Table (Feed Post Likes)

```sql
-- ============================================
-- LIKES TABLE (Feed Post Likes)
-- ============================================

DROP TABLE IF EXISTS likes CASCADE;

CREATE TABLE likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts" ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON likes;
CREATE POLICY "Users can unlike posts" ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: auto-update posts.like_count and users.total_likes_received
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    UPDATE users SET total_likes_received = total_likes_received + 1
      WHERE id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    UPDATE users SET total_likes_received = total_likes_received - 1
      WHERE id = (SELECT user_id FROM posts WHERE id = OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_like_count ON likes;
CREATE TRIGGER trigger_update_post_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();
```

---

## BLOCK 4: Comments Table (Feed Post Comments)

```sql
-- ============================================
-- COMMENTS TABLE (Feed Post Comments)
-- ============================================

DROP TABLE IF EXISTS comments CASCADE;

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any comment" ON comments;
CREATE POLICY "Admins can delete any comment" ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Trigger: auto-update posts.comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();
```

---

## BLOCK 5: Blog Posts Table

```sql
-- ============================================
-- BLOG POSTS TABLE
-- ============================================

DROP TABLE IF EXISTS blog_posts CASCADE;

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category VARCHAR(50) DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  read_time_minutes INT DEFAULT 5,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published blog posts" ON blog_posts;
CREATE POLICY "Anyone can view published blog posts" ON blog_posts FOR SELECT
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Admins can insert blog posts" ON blog_posts;
CREATE POLICY "Admins can insert blog posts" ON blog_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Admins can update blog posts" ON blog_posts;
CREATE POLICY "Admins can update blog posts" ON blog_posts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Admins can delete blog posts" ON blog_posts;
CREATE POLICY "Admins can delete blog posts" ON blog_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## BLOCK 6: Blog Comments Table

```sql
-- ============================================
-- BLOG COMMENTS TABLE
-- ============================================

DROP TABLE IF EXISTS blog_comments CASCADE;

CREATE TABLE blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  like_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog comments" ON blog_comments;
CREATE POLICY "Anyone can read blog comments" ON blog_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create blog comments" ON blog_comments;
CREATE POLICY "Authenticated users can create blog comments" ON blog_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blog comments" ON blog_comments;
CREATE POLICY "Users can delete own blog comments" ON blog_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

---

## BLOCK 7: Blog Comment Likes Table

```sql
-- ============================================
-- BLOG COMMENT LIKES TABLE
-- ============================================

DROP TABLE IF EXISTS blog_comment_likes CASCADE;

CREATE TABLE blog_comment_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);

ALTER TABLE blog_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog comment likes" ON blog_comment_likes;
CREATE POLICY "Anyone can read blog comment likes" ON blog_comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like blog comments" ON blog_comment_likes;
CREATE POLICY "Authenticated users can like blog comments" ON blog_comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike blog comments" ON blog_comment_likes;
CREATE POLICY "Users can unlike blog comments" ON blog_comment_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: auto-update blog_comments.like_count
CREATE OR REPLACE FUNCTION update_blog_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_blog_comment_like_change ON blog_comment_likes;
CREATE TRIGGER on_blog_comment_like_change
  AFTER INSERT OR DELETE ON blog_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_comment_like_count();
```

---

## BLOCK 8: Blog Submissions Table

```sql
-- ============================================
-- BLOG SUBMISSIONS TABLE (User Stories)
-- ============================================

DROP TABLE IF EXISTS blog_submissions CASCADE;

CREATE TABLE blog_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'rant',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_submissions_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT blog_submissions_content_length CHECK (char_length(content) BETWEEN 1 AND 5000),
  CONSTRAINT blog_submissions_status_values CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_blog_submissions_status ON blog_submissions(status);

ALTER TABLE blog_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own submissions" ON blog_submissions;
CREATE POLICY "Users can read own submissions" ON blog_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all submissions" ON blog_submissions;
CREATE POLICY "Admins can read all submissions" ON blog_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Authenticated users can insert submissions" ON blog_submissions;
CREATE POLICY "Authenticated users can insert submissions" ON blog_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update submissions" ON blog_submissions;
CREATE POLICY "Admins can update submissions" ON blog_submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
```

---

## BLOCK 9: Remaining Tables (follows, saved_posts, etc.)

```sql
-- ============================================
-- FOLLOWS TABLE
-- ============================================

DROP TABLE IF EXISTS follows CASCADE;

CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Trigger: auto-update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE users SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- ============================================
-- SAVED POSTS TABLE
-- ============================================

DROP TABLE IF EXISTS saved_posts CASCADE;

CREATE TABLE saved_posts (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved" ON saved_posts;
CREATE POLICY "Users can view own saved" ON saved_posts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
CREATE POLICY "Users can save posts" ON saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;
CREATE POLICY "Users can unsave posts" ON saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## BLOCK 10: Verify Everything

Run after all blocks above:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled on critical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'posts', 'likes', 'comments', 'blog_posts', 'blog_comments', 'blog_comment_likes', 'blog_submissions', 'follows', 'saved_posts', 'notifications')
ORDER BY tablename;

-- Check triggers exist
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```
