-- Migration: Permanent fix for likes and comments counts
--
-- Root cause: Trigger functions were NOT SECURITY DEFINER, so when user B likes
-- user A's post, RLS blocked the UPDATE to posts.like_count (only owner can update).
-- The like row was inserted, but the count never updated = filled heart but "0 likes".
--
-- This migration:
--   1. Makes count triggers SECURITY DEFINER to bypass RLS
--   2. Makes notification triggers fail-safe (log errors, don't block likes/comments)
--   3. Adds unique constraint on likes (already primary key, but explicit)
--   4. Recounts all posts from actual rows (one-time repair)
--   5. Adds GREATEST(0, ...) clamp to prevent negative counts

-- ============================================================================
-- STEP 1: Drop and recreate like_count trigger with SECURITY DEFINER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_like_count ON likes;
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON likes;
DROP FUNCTION IF EXISTS update_post_like_count() CASCADE;

CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    UPDATE users SET total_likes_received = total_likes_received + 1
      WHERE id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    UPDATE users SET total_likes_received = GREATEST(0, total_likes_received - 1)
      WHERE id = (SELECT user_id FROM posts WHERE id = OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- ============================================================================
-- STEP 2: Drop and recreate comment_count trigger with SECURITY DEFINER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
DROP FUNCTION IF EXISTS update_post_comment_count() CASCADE;

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- ============================================================================
-- STEP 3: Make notification triggers fail-safe (never block likes/comments)
-- ============================================================================

DROP TRIGGER IF EXISTS on_like_notification ON likes;
DROP FUNCTION IF EXISTS create_like_notification() CASCADE;

CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Wrap in exception handler so notification failure never blocks the like
  BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

    -- Don't notify if liking your own post
    IF NEW.user_id != post_owner_id AND post_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, actor_id, post_id, is_read, read)
      VALUES (
        post_owner_id,
        'like',
        'New like',
        NEW.user_id,
        NEW.post_id,
        FALSE,
        FALSE
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the like
    RAISE WARNING 'create_like_notification failed for post_id=%: %', NEW.post_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- Comment notification (fail-safe)
DROP TRIGGER IF EXISTS on_comment_notification ON comments;
DROP FUNCTION IF EXISTS create_comment_notification() CASCADE;

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Wrap in exception handler so notification failure never blocks the comment
  BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

    -- Don't notify if commenting on your own post
    IF NEW.user_id != post_owner_id AND post_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, actor_id, post_id, is_read, read)
      VALUES (
        post_owner_id,
        'comment',
        'New comment',
        NEW.user_id,
        NEW.post_id,
        FALSE,
        FALSE
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the comment
    RAISE WARNING 'create_comment_notification failed for post_id=%: %', NEW.post_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- ============================================================================
-- STEP 4: Ensure unique constraint on likes (already PK, but be explicit)
-- ============================================================================

-- The likes table already has PRIMARY KEY (user_id, post_id) from initial schema
-- This prevents duplicates. Adding explicit unique constraint for clarity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_post_unique'
  ) THEN
    -- Only add if not already a primary key constraint
    BEGIN
      ALTER TABLE likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists (from PK), ignore
      NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: One-time repair - recalculate all counts from actual rows
-- ============================================================================

-- Posts: recalculate like_count from likes table
UPDATE posts p
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id),
  0
);

-- Posts: recalculate comment_count from comments table
UPDATE posts p
SET comment_count = COALESCE(
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id),
  0
);

-- Users: recalculate total_likes_received
UPDATE users u
SET total_likes_received = COALESCE(
  (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = u.id),
  0
);

-- ============================================================================
-- STEP 6: Add/ensure CHECK constraints prevent negative counts
-- ============================================================================

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_like_count_non_negative;
ALTER TABLE posts ADD CONSTRAINT posts_like_count_non_negative CHECK (like_count >= 0);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_comment_count_non_negative;
ALTER TABLE posts ADD CONSTRAINT posts_comment_count_non_negative CHECK (comment_count >= 0);

-- ============================================================================
-- STEP 7: RLS policies for likes and comments (ensure correct)
-- ============================================================================

-- Likes: anyone can read, users can insert/delete only their own
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON likes;
CREATE POLICY "Users can unlike posts" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, users can insert their own, edit/delete only their own
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: Create functions for nightly cron verification
-- ============================================================================

-- Function to check like_count drift
CREATE OR REPLACE FUNCTION check_like_count_drift()
RETURNS TABLE(post_id UUID, stored_count INT, actual_count BIGINT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.like_count, COUNT(l.user_id)::BIGINT
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id
  GROUP BY p.id
  HAVING p.like_count != COUNT(l.user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check comment_count drift
CREATE OR REPLACE FUNCTION check_comment_count_drift()
RETURNS TABLE(post_id UUID, stored_count INT, actual_count BIGINT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.comment_count, COUNT(c.id)::BIGINT
  FROM posts p
  LEFT JOIN comments c ON c.post_id = p.id
  GROUP BY p.id
  HAVING p.comment_count != COUNT(c.id);
END;
$$ LANGUAGE plpgsql;

-- Function to fix all post counts (used by cron if drift detected)
CREATE OR REPLACE FUNCTION fix_post_counts()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fix like_count
  UPDATE posts p
  SET like_count = COALESCE(
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id),
    0
  );

  -- Fix comment_count
  UPDATE posts p
  SET comment_count = COALESCE(
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id),
    0
  );

  -- Fix users.total_likes_received
  UPDATE users u
  SET total_likes_received = COALESCE(
    (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = u.id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION: Check your work
-- ============================================================================
-- Run this after migration to verify:
--
-- SELECT 'Posts with wrong like_count' as check_type, COUNT(*) as count
-- FROM posts p
-- WHERE p.like_count != (SELECT COUNT(*) FROM likes WHERE post_id = p.id);
--
-- SELECT 'Posts with wrong comment_count' as check_type, COUNT(*) as count
-- FROM posts p
-- WHERE p.comment_count != (SELECT COUNT(*) FROM comments WHERE post_id = p.id);
