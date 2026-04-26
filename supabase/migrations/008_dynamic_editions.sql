-- ============================================
-- 008: Dynamic Editions Management System
-- Replaces hardcoded edition enum with a dynamic editions table
-- ============================================

-- Step 1: Create the editions table
CREATE TABLE IF NOT EXISTS editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#7c3aed',
  gradient_from VARCHAR(30) NOT NULL DEFAULT 'from-purple-500',
  gradient_to VARCHAR(30) NOT NULL DEFAULT 'to-violet-600',
  gradient_bg VARCHAR(60) NOT NULL DEFAULT 'bg-purple-50 dark:bg-purple-950/30',
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_editions_slug ON editions(slug);
CREATE INDEX idx_editions_active_order ON editions(is_active, display_order);

-- Step 2: Seed existing editions
INSERT INTO editions (slug, display_name, color, gradient_from, gradient_to, gradient_bg, is_active, display_order)
VALUES
  ('lavender', 'Lavender Edition', '#E6E6FA', 'from-purple-500', 'to-violet-600', 'bg-purple-50 dark:bg-purple-950/30', true, 1),
  ('pink', 'Pink Edition', '#FFB6C1', 'from-pink-500', 'to-rose-500', 'bg-pink-50 dark:bg-pink-950/30', true, 2),
  ('christmas', 'Christmas Edition', '#C41E3A', 'from-red-500', 'to-green-600', 'bg-red-50 dark:bg-red-950/30', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Drop the default on editions_owned BEFORE converting types
-- (the default references the edition enum type which blocks DROP TYPE)
ALTER TABLE users ALTER COLUMN editions_owned DROP DEFAULT;

-- Step 4: Migrate columns from edition enum to TEXT
-- This preserves all existing data while enabling dynamic editions
ALTER TABLE users ALTER COLUMN editions_owned TYPE TEXT[] USING editions_owned::TEXT[];
ALTER TABLE posts ALTER COLUMN edition TYPE TEXT USING edition::TEXT;
ALTER TABLE reference_images ALTER COLUMN edition TYPE TEXT USING edition::TEXT;

-- Step 5: Restore a TEXT[] default on editions_owned
ALTER TABLE users ALTER COLUMN editions_owned SET DEFAULT '{}';

-- Step 6: Drop the old enum type (now safe)
DROP TYPE IF EXISTS edition;

-- Step 7: Add foreign key constraints
-- reference_images.edition -> editions.slug (NOT NULL column)
ALTER TABLE reference_images
  ADD CONSTRAINT fk_reference_images_edition
  FOREIGN KEY (edition) REFERENCES editions(slug) ON UPDATE CASCADE;

-- posts.edition -> editions.slug (nullable column)
ALTER TABLE posts
  ADD CONSTRAINT fk_posts_edition
  FOREIGN KEY (edition) REFERENCES editions(slug) ON UPDATE CASCADE;

-- Note: users.editions_owned is TEXT[] - PostgreSQL does not support FK on array elements.
-- Validation is handled at the API layer.

-- Step 8: RLS policies
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

-- Anyone can view editions
CREATE POLICY "Anyone can view editions" ON editions
  FOR SELECT USING (true);

-- Allow admins to insert editions
CREATE POLICY "Admins can insert editions" ON editions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to update editions
CREATE POLICY "Admins can update editions" ON editions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to delete editions
CREATE POLICY "Admins can delete editions" ON editions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Step 9: Updated_at trigger (reuses existing function from 001)
CREATE TRIGGER update_editions_updated_at
  BEFORE UPDATE ON editions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
