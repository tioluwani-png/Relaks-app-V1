-- Blog Comments & Likes
-- Threaded comments system for blog posts

-- ==========================================
-- Blog Comments table
-- ==========================================
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  like_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_blog_comments_post_id ON blog_comments(blog_post_id);
CREATE INDEX idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX idx_blog_comments_user_id ON blog_comments(user_id);

-- RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog comments"
  ON blog_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create blog comments"
  ON blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blog comments"
  ON blog_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- Blog Comment Likes table
-- ==========================================
CREATE TABLE IF NOT EXISTS blog_comment_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);

-- RLS
ALTER TABLE blog_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog comment likes"
  ON blog_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like blog comments"
  ON blog_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike blog comments"
  ON blog_comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- Trigger: auto-update like_count on blog_comments
-- ==========================================
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

CREATE TRIGGER on_blog_comment_like_change
  AFTER INSERT OR DELETE ON blog_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_comment_like_count();
