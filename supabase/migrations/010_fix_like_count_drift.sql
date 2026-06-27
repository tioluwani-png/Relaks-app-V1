-- Migration: Fix like_count drift and add safety clamps
--
-- Problem: like_count columns could drift from actual like rows due to:
--   1. Book reviews/comments had DUAL WRITERS (API + trigger both updating)
--   2. Posts had an unconfirmed corruption source (resynced, monitor for recurrence)
--
-- Solution:
--   1. Resync all like_count columns from actual likes tables
--   2. Add GREATEST(0, ...) clamp to all triggers to prevent negatives
--
-- Reversible: Yes (see bottom of file)

-- ============================================================================
-- STEP 1: Resync like_count from actual likes (fixes corrupted data)
-- ============================================================================

-- Posts: resync like_count from likes table
UPDATE posts p
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id),
  0
);

-- Book reviews: resync like_count from book_review_likes table
UPDATE book_reviews br
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM book_review_likes WHERE review_id = br.id),
  0
);

-- Book comments: resync like_count from book_comment_likes table
UPDATE book_comments bc
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM book_comment_likes WHERE comment_id = bc.id),
  0
);

-- Books: resync like_count from book_likes table (precautionary)
UPDATE books b
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM book_likes WHERE book_id = b.id),
  0
);

-- Blog comments: resync like_count from blog_comment_likes table (precautionary)
UPDATE blog_comments bc
SET like_count = COALESCE(
  (SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = bc.id),
  0
);

-- Users: resync total_likes_received from actual likes on their posts
UPDATE users u
SET total_likes_received = COALESCE(
  (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = u.id),
  0
);

-- ============================================================================
-- STEP 2: Update triggers with GREATEST(0, ...) clamp (prevents future negatives)
-- ============================================================================

-- Posts like count trigger (with clamp)
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
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

-- Book like count trigger (with clamp)
CREATE OR REPLACE FUNCTION update_book_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET like_count = like_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Book review like count trigger (with clamp)
CREATE OR REPLACE FUNCTION update_review_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_reviews SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Book comment like count trigger (with clamp)
CREATE OR REPLACE FUNCTION update_book_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Blog comment like count trigger (with clamp)
CREATE OR REPLACE FUNCTION update_blog_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Add CHECK constraint to catch future drift (optional monitoring)
-- Note: This will fail if like_count goes negative, alerting us to issues
-- ============================================================================

-- Add CHECK constraints (will fail on insert/update if negative)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_like_count_non_negative;
ALTER TABLE posts ADD CONSTRAINT posts_like_count_non_negative CHECK (like_count >= 0);

ALTER TABLE books DROP CONSTRAINT IF EXISTS books_like_count_non_negative;
ALTER TABLE books ADD CONSTRAINT books_like_count_non_negative CHECK (like_count >= 0);

ALTER TABLE book_reviews DROP CONSTRAINT IF EXISTS book_reviews_like_count_non_negative;
ALTER TABLE book_reviews ADD CONSTRAINT book_reviews_like_count_non_negative CHECK (like_count >= 0);

ALTER TABLE book_comments DROP CONSTRAINT IF EXISTS book_comments_like_count_non_negative;
ALTER TABLE book_comments ADD CONSTRAINT book_comments_like_count_non_negative CHECK (like_count >= 0);

ALTER TABLE blog_comments DROP CONSTRAINT IF EXISTS blog_comments_like_count_non_negative;
ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_like_count_non_negative CHECK (like_count >= 0);

-- ============================================================================
-- ROLLBACK (if needed, run these manually)
-- ============================================================================
--
-- -- Remove CHECK constraints
-- ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_like_count_non_negative;
-- ALTER TABLE books DROP CONSTRAINT IF EXISTS books_like_count_non_negative;
-- ALTER TABLE book_reviews DROP CONSTRAINT IF EXISTS book_reviews_like_count_non_negative;
-- ALTER TABLE book_comments DROP CONSTRAINT IF EXISTS book_comments_like_count_non_negative;
-- ALTER TABLE blog_comments DROP CONSTRAINT IF EXISTS blog_comments_like_count_non_negative;
--
-- -- Restore original triggers (without GREATEST clamp)
-- CREATE OR REPLACE FUNCTION update_post_like_count()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
--     UPDATE users SET total_likes_received = total_likes_received + 1
--     WHERE id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
--   ELSIF TG_OP = 'DELETE' THEN
--     UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
--     UPDATE users SET total_likes_received = total_likes_received - 1
--     WHERE id = (SELECT user_id FROM posts WHERE id = OLD.post_id);
--   END IF;
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- (repeat for other triggers...)
