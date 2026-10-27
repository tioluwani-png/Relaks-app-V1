-- ============================================
-- Featured posts on the homepage "Colored by the community" gallery
-- Run in the Supabase SQL Editor.
-- ============================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS featured_on_home BOOLEAN NOT NULL DEFAULT FALSE;

-- The homepage reads at most 12 featured posts, newest first
CREATE INDEX IF NOT EXISTS idx_posts_featured_on_home
  ON posts (created_at DESC)
  WHERE featured_on_home = TRUE;

-- "Users can update own posts" would otherwise let anyone feature their own post.
-- Only staff (or the service role, which has no auth.uid()) may set the flag.
CREATE OR REPLACE FUNCTION guard_posts_featured_on_home()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.featured_on_home)
     OR (TG_OP = 'UPDATE' AND NEW.featured_on_home IS DISTINCT FROM OLD.featured_on_home) THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('moderator', 'admin', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Only staff can feature posts on the homepage'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_featured_on_home_guard ON posts;
CREATE TRIGGER posts_featured_on_home_guard
  BEFORE INSERT OR UPDATE OF featured_on_home ON posts
  FOR EACH ROW
  EXECUTE FUNCTION guard_posts_featured_on_home();

-- Verify
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'posts' AND column_name = 'featured_on_home';
