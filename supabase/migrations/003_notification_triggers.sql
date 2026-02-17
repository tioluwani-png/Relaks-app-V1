-- ============================================
-- NOTIFICATION TRIGGERS
-- Auto-create notifications for follows, likes, comments
-- ============================================

-- Add actor_id and post_id columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'actor_id') THEN
    ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'post_id') THEN
    ALTER TABLE notifications ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Sync is_read with read column
UPDATE notifications SET is_read = read WHERE is_read IS NULL;

-- Create index on actor_id
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- ============================================
-- FOLLOW NOTIFICATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't notify if following yourself
  IF NEW.follower_id != NEW.following_id THEN
    INSERT INTO notifications (user_id, type, title, actor_id, is_read, read)
    VALUES (
      NEW.following_id,
      'follow',
      'New follower',
      NEW.follower_id,
      FALSE,
      FALSE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_notification ON follows;
CREATE TRIGGER on_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

-- ============================================
-- LIKE NOTIFICATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't notify if liking your own post
  IF NEW.user_id != post_owner_id THEN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_notification ON likes;
CREATE TRIGGER on_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- ============================================
-- COMMENT NOTIFICATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't notify if commenting on your own post
  IF NEW.user_id != post_owner_id THEN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_notification ON comments;
CREATE TRIGGER on_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- ============================================
-- UPDATE RLS - Allow trigger inserts (SECURITY DEFINER handles this)
-- ============================================
-- The triggers use SECURITY DEFINER which bypasses RLS,
-- so the existing "Block client inserts" policy stays in place
-- while triggers can still insert.
