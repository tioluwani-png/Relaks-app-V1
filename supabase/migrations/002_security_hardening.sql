-- ==========================================
-- SECURITY HARDENING MIGRATION
-- Hardens RLS policies, adds role/credit protections,
-- admin policies, and banned-user enforcement.
-- ==========================================

-- Add role and banned columns if missing (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
    ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
    ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN banned_reason TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_flagged') THEN
    ALTER TABLE posts ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
    ALTER TABLE posts ADD COLUMN flag_reason TEXT;
    ALTER TABLE posts ADD COLUMN flagged_at TIMESTAMPTZ;
  END IF;
END $$;

-- ==========================================
-- USERS TABLE - Harden policies
-- ==========================================
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Super admins can update any user" ON users;

-- Anyone can view profiles (needed for feeds, comments, profiles)
CREATE POLICY "Anyone can view profiles" ON users
  FOR SELECT
  USING (true);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update own profile but CANNOT change role, credits, or ban status
CREATE POLICY "Users can update own safe fields" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT role FROM users WHERE id = auth.uid())
    AND ai_credits IS NOT DISTINCT FROM (SELECT ai_credits FROM users WHERE id = auth.uid())
    AND free_pages_remaining IS NOT DISTINCT FROM (SELECT free_pages_remaining FROM users WHERE id = auth.uid())
    AND is_banned IS NOT DISTINCT FROM (SELECT is_banned FROM users WHERE id = auth.uid())
    AND is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM users WHERE id = auth.uid())
    AND total_likes_received IS NOT DISTINCT FROM (SELECT total_likes_received FROM users WHERE id = auth.uid())
    AND follower_count IS NOT DISTINCT FROM (SELECT follower_count FROM users WHERE id = auth.uid())
    AND following_count IS NOT DISTINCT FROM (SELECT following_count FROM users WHERE id = auth.uid())
  );

-- ==========================================
-- POSTS TABLE - Add admin delete policy
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;
DROP POLICY IF EXISTS "Users can create own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Admins can delete any post" ON posts;

CREATE POLICY "Anyone can view public posts" ON posts
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins/moderators can delete any post (content moderation)
CREATE POLICY "Admins can delete any post" ON posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Admins can flag/update any post
CREATE POLICY "Admins can update any post" ON posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- ==========================================
-- LIKES TABLE (unchanged, already correct)
-- ==========================================
-- Policies already correct in 001_initial_schema.sql

-- ==========================================
-- COMMENTS TABLE - Add update policy
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON comments;

CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete any comment" ON comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- ==========================================
-- FOLLOWS TABLE (unchanged, already correct)
-- ==========================================

-- ==========================================
-- JOURNAL ENTRIES (unchanged, already correct - private per user)
-- ==========================================

-- ==========================================
-- PURCHASES TABLE - Restrict to view-only from client
-- ==========================================
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can create purchases" ON purchases;
DROP POLICY IF EXISTS "Block client inserts for purchases" ON purchases;

-- Users can only VIEW their own purchases
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block client-side inserts (only service role via webhook can insert)
CREATE POLICY "Block client inserts for purchases" ON purchases
  FOR INSERT
  WITH CHECK (false);

-- No client updates or deletes
CREATE POLICY "No purchase updates" ON purchases
  FOR UPDATE
  USING (false);

CREATE POLICY "No purchase deletes" ON purchases
  FOR DELETE
  USING (false);

-- ==========================================
-- AI GENERATIONS - Restrict inserts to service role
-- ==========================================
DROP POLICY IF EXISTS "Users can view own generations" ON ai_generations;
DROP POLICY IF EXISTS "Users can create generations" ON ai_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON ai_generations;
DROP POLICY IF EXISTS "Block client inserts for ai_generations" ON ai_generations;

CREATE POLICY "Users can view own generations" ON ai_generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block client-side inserts (only API route with service role can insert)
CREATE POLICY "Block client inserts for ai_generations" ON ai_generations
  FOR INSERT
  WITH CHECK (false);

-- Block client updates
CREATE POLICY "Block client updates for ai_generations" ON ai_generations
  FOR UPDATE
  USING (false);

-- ==========================================
-- REPORTS TABLE - Harden policies
-- ==========================================
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Admins can view reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

-- Any authenticated user can create a report
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Only admins/moderators can view all reports
CREATE POLICY "Admins can view reports" ON reports
  FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- Only admins can update reports (change status, reviewed_by)
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
    )
  );

-- ==========================================
-- REFERENCE IMAGES - Add admin write policy
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view references" ON reference_images;
DROP POLICY IF EXISTS "Admins can manage references" ON reference_images;

CREATE POLICY "Anyone can view references" ON reference_images
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete references
CREATE POLICY "Admins can insert references" ON reference_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update references" ON reference_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete references" ON reference_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ==========================================
-- COLORING PAGES - Public read, admin write
-- ==========================================
-- Already has public read. Add admin write.
CREATE POLICY "Admins can manage coloring pages" ON coloring_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ==========================================
-- NOTIFICATIONS - Block client inserts
-- ==========================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only mark their own notifications as read
CREATE POLICY "Users can mark own notifications read" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Block client inserts for notifications (service role only)
CREATE POLICY "Block client inserts for notifications" ON notifications
  FOR INSERT
  WITH CHECK (false);

-- ==========================================
-- SAVED POSTS (unchanged, already correct)
-- ==========================================

-- ==========================================
-- DATABASE FUNCTION: Atomic credit deduction
-- Used by API routes to safely deduct credits
-- ==========================================
CREATE OR REPLACE FUNCTION deduct_ai_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  current_credits INT;
BEGIN
  SELECT ai_credits INTO current_credits
  FROM users
  WHERE id = p_user_id
  FOR UPDATE; -- Row-level lock

  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: have %, need %', current_credits, p_amount;
  END IF;

  UPDATE users
  SET ai_credits = ai_credits - p_amount
  WHERE id = p_user_id;

  RETURN current_credits - p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- DATABASE FUNCTION: Atomic credit addition
-- Used by webhook to safely add credits
-- ==========================================
CREATE OR REPLACE FUNCTION add_ai_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE users
  SET ai_credits = ai_credits + p_amount
  WHERE id = p_user_id
  RETURNING ai_credits INTO new_credits;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same for free pages
CREATE OR REPLACE FUNCTION add_free_pages(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_pages INT;
BEGIN
  UPDATE users
  SET free_pages_remaining = free_pages_remaining + p_amount
  WHERE id = p_user_id
  RETURNING free_pages_remaining INTO new_pages;

  RETURN new_pages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
