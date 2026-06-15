-- =============================================
-- 009: Reading Club System
-- Adds book catalog, wishlists, reading history,
-- book requests, reading lists, reviews, and comments
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Reading status enum
DO $$ BEGIN
  CREATE TYPE reading_status AS ENUM ('want_to_read', 'reading', 'read', 'dnf');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Book request status enum
DO $$ BEGIN
  CREATE TYPE book_request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- Book genres for categorization
CREATE TABLE IF NOT EXISTS book_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#A855F7',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT book_genres_name_unique UNIQUE (name),
  CONSTRAINT book_genres_slug_unique UNIQUE (slug)
);

-- Main books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200) NOT NULL,
  genre_id UUID REFERENCES book_genres(id) ON DELETE SET NULL,
  description TEXT,
  cover_url TEXT,
  isbn VARCHAR(20),
  page_count INT,
  published_year INT,
  like_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User wishlists (book saves)
CREATE TABLE IF NOT EXISTS book_saves (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- Reading history
CREATE TABLE IF NOT EXISTS book_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status reading_status DEFAULT 'want_to_read',
  rating INT CHECK (rating >= 1 AND rating <= 5),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT book_reads_user_book_unique UNIQUE (user_id, book_id)
);

-- Book requests (for books not in catalog)
CREATE TABLE IF NOT EXISTS book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  book_title VARCHAR(300) NOT NULL,
  author VARCHAR(200),
  reason TEXT,
  vote_count INT DEFAULT 1,
  status book_request_status DEFAULT 'pending',
  fulfilled_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request votes (one vote per user per request)
CREATE TABLE IF NOT EXISTS book_request_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES book_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, request_id)
);

-- Reading lists
CREATE TABLE IF NOT EXISTS reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  book_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading list items
CREATE TABLE IF NOT EXISTS reading_list_items (
  list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, book_id)
);

-- Reading list follows
CREATE TABLE IF NOT EXISTS reading_list_follows (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, list_id)
);

-- Book reviews
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  body TEXT NOT NULL,
  like_count INT DEFAULT 0,
  is_spoiler BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT book_reviews_user_book_unique UNIQUE (user_id, book_id)
);

-- Book likes
CREATE TABLE IF NOT EXISTS book_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- Book comments
CREATE TABLE IF NOT EXISTS book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book comment likes
CREATE TABLE IF NOT EXISTS book_comment_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- Review likes
CREATE TABLE IF NOT EXISTS book_review_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES book_reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, review_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_active ON books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_like_count ON books(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_save_count ON books(save_count DESC);

CREATE INDEX IF NOT EXISTS idx_book_saves_user ON book_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_book_saves_book ON book_saves(book_id);

CREATE INDEX IF NOT EXISTS idx_book_reads_user ON book_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reads_book ON book_reads(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reads_status ON book_reads(status);

CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status);
CREATE INDEX IF NOT EXISTS idx_book_requests_votes ON book_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_book_requests_created ON book_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_public ON reading_lists(is_public);
CREATE INDEX IF NOT EXISTS idx_reading_lists_created ON reading_lists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user ON book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_rating ON book_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_book_reviews_created ON book_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_comments_book ON book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent ON book_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_created ON book_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_genres_order ON book_genres(display_order);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE book_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_review_likes ENABLE ROW LEVEL SECURITY;

-- Book genres: Anyone can read
CREATE POLICY "Anyone can read book genres"
  ON book_genres FOR SELECT
  USING (true);

-- Books: Anyone can read active books
CREATE POLICY "Anyone can read active books"
  ON books FOR SELECT
  USING (is_active = true);

-- Books: Admins can do everything
CREATE POLICY "Admins can manage books"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Book saves: Users can manage their own saves
CREATE POLICY "Users can view all saves"
  ON book_saves FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their saves"
  ON book_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saves"
  ON book_saves FOR DELETE
  USING (auth.uid() = user_id);

-- Book reads: Users can manage their own reading history
CREATE POLICY "Users can view their reads"
  ON book_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their reads"
  ON book_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reads"
  ON book_reads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their reads"
  ON book_reads FOR DELETE
  USING (auth.uid() = user_id);

-- Book requests: Anyone can read, authenticated users can create
CREATE POLICY "Anyone can read book requests"
  ON book_requests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create requests"
  ON book_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
  ON book_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Request votes: Users can manage their own votes
CREATE POLICY "Anyone can view votes"
  ON book_request_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote"
  ON book_request_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
  ON book_request_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Reading lists: Public lists visible to all, private only to owner
CREATE POLICY "Anyone can read public lists"
  ON reading_lists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create lists"
  ON reading_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their lists"
  ON reading_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their lists"
  ON reading_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Reading list items: Follow list visibility
CREATE POLICY "Anyone can view items in accessible lists"
  ON reading_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reading_lists
      WHERE id = list_id
      AND (is_public = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "List owners can manage items"
  ON reading_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can update items"
  ON reading_list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reading_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can delete items"
  ON reading_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reading_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

-- Reading list follows
CREATE POLICY "Anyone can view list follows"
  ON reading_list_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow lists"
  ON reading_list_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow lists"
  ON reading_list_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Book reviews: Anyone can read, users manage their own
CREATE POLICY "Anyone can read reviews"
  ON book_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON book_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reviews"
  ON book_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their reviews"
  ON book_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Book likes: Users manage their own
CREATE POLICY "Anyone can view likes"
  ON book_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like books"
  ON book_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike books"
  ON book_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Book comments: Anyone can read, users manage their own
CREATE POLICY "Anyone can read comments"
  ON book_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON book_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
  ON book_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Comment likes
CREATE POLICY "Anyone can view comment likes"
  ON book_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like comments"
  ON book_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON book_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Review likes
CREATE POLICY "Anyone can view review likes"
  ON book_review_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like reviews"
  ON book_review_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reviews"
  ON book_review_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS FOR DENORMALIZED COUNTS
-- =============================================

-- Update book like count
CREATE OR REPLACE FUNCTION update_book_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET like_count = like_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books SET like_count = like_count - 1 WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_book_like_count ON book_likes;
CREATE TRIGGER trigger_book_like_count
  AFTER INSERT OR DELETE ON book_likes
  FOR EACH ROW EXECUTE FUNCTION update_book_like_count();

-- Update book save count
CREATE OR REPLACE FUNCTION update_book_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET save_count = save_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books SET save_count = save_count - 1 WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_book_save_count ON book_saves;
CREATE TRIGGER trigger_book_save_count
  AFTER INSERT OR DELETE ON book_saves
  FOR EACH ROW EXECUTE FUNCTION update_book_save_count();

-- Update book review count
CREATE OR REPLACE FUNCTION update_book_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET review_count = review_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books SET review_count = review_count - 1 WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_book_review_count ON book_reviews;
CREATE TRIGGER trigger_book_review_count
  AFTER INSERT OR DELETE ON book_reviews
  FOR EACH ROW EXECUTE FUNCTION update_book_review_count();

-- Update request vote count
CREATE OR REPLACE FUNCTION update_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_requests SET vote_count = vote_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_requests SET vote_count = vote_count - 1 WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_request_vote_count ON book_request_votes;
CREATE TRIGGER trigger_request_vote_count
  AFTER INSERT OR DELETE ON book_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_request_vote_count();

-- Update reading list book count
CREATE OR REPLACE FUNCTION update_reading_list_book_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reading_lists SET book_count = book_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reading_lists SET book_count = book_count - 1 WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reading_list_book_count ON reading_list_items;
CREATE TRIGGER trigger_reading_list_book_count
  AFTER INSERT OR DELETE ON reading_list_items
  FOR EACH ROW EXECUTE FUNCTION update_reading_list_book_count();

-- Update reading list follower count
CREATE OR REPLACE FUNCTION update_reading_list_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reading_lists SET follower_count = follower_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reading_lists SET follower_count = follower_count - 1 WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reading_list_follower_count ON reading_list_follows;
CREATE TRIGGER trigger_reading_list_follower_count
  AFTER INSERT OR DELETE ON reading_list_follows
  FOR EACH ROW EXECUTE FUNCTION update_reading_list_follower_count();

-- Update review like count
CREATE OR REPLACE FUNCTION update_review_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_reviews SET like_count = like_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_review_like_count ON book_review_likes;
CREATE TRIGGER trigger_review_like_count
  AFTER INSERT OR DELETE ON book_review_likes
  FOR EACH ROW EXECUTE FUNCTION update_review_like_count();

-- Update comment like count
CREATE OR REPLACE FUNCTION update_book_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_book_comment_like_count ON book_comment_likes;
CREATE TRIGGER trigger_book_comment_like_count
  AFTER INSERT OR DELETE ON book_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_book_comment_like_count();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_books_updated_at ON books;
CREATE TRIGGER trigger_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

DROP TRIGGER IF EXISTS trigger_book_reads_updated_at ON book_reads;
CREATE TRIGGER trigger_book_reads_updated_at
  BEFORE UPDATE ON book_reads
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

DROP TRIGGER IF EXISTS trigger_book_requests_updated_at ON book_requests;
CREATE TRIGGER trigger_book_requests_updated_at
  BEFORE UPDATE ON book_requests
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

DROP TRIGGER IF EXISTS trigger_reading_lists_updated_at ON reading_lists;
CREATE TRIGGER trigger_reading_lists_updated_at
  BEFORE UPDATE ON reading_lists
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

DROP TRIGGER IF EXISTS trigger_book_reviews_updated_at ON book_reviews;
CREATE TRIGGER trigger_book_reviews_updated_at
  BEFORE UPDATE ON book_reviews
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

-- =============================================
-- SEED DATA: Default genres
-- =============================================

INSERT INTO book_genres (name, slug, description, color, display_order)
VALUES
  ('Fiction', 'fiction', 'Novels, short stories, and literary fiction', '#8B5CF6', 1),
  ('Non-Fiction', 'non-fiction', 'True stories, biographies, and factual accounts', '#3B82F6', 2),
  ('Self-Development', 'self-development', 'Personal growth, productivity, and self-help', '#10B981', 3),
  ('Romance', 'romance', 'Love stories and romantic fiction', '#EC4899', 4),
  ('Nigerian Fiction', 'nigerian-fiction', 'Stories by Nigerian authors', '#F59E0B', 5),
  ('African Literature', 'african-literature', 'Literature from across Africa', '#EF4444', 6),
  ('Wellness', 'wellness', 'Mental health, mindfulness, and wellbeing', '#14B8A6', 7),
  ('Poetry', 'poetry', 'Poems and verse collections', '#A855F7', 8),
  ('Spirituality', 'spirituality', 'Faith, spirituality, and religious texts', '#6366F1', 9),
  ('Business', 'business', 'Entrepreneurship, leadership, and career', '#64748B', 10)
ON CONFLICT (slug) DO NOTHING;
