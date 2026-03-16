-- Blog submissions table for user-submitted stories/rants
CREATE TABLE IF NOT EXISTS blog_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'rant',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add check constraints
ALTER TABLE blog_submissions
  ADD CONSTRAINT blog_submissions_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT blog_submissions_content_length CHECK (char_length(content) BETWEEN 1 AND 5000),
  ADD CONSTRAINT blog_submissions_status_values CHECK (status IN ('pending', 'approved', 'rejected'));

-- Index on status for admin filtering
CREATE INDEX idx_blog_submissions_status ON blog_submissions(status);

-- RLS
ALTER TABLE blog_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own submissions
CREATE POLICY "Users can read own submissions"
  ON blog_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all submissions
CREATE POLICY "Admins can read all submissions"
  ON blog_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Authenticated users can insert their own submissions
CREATE POLICY "Authenticated users can insert submissions"
  ON blog_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any submission (status, admin_notes)
CREATE POLICY "Admins can update submissions"
  ON blog_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
