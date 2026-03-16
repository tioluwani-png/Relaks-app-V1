export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Edition = 'lavender' | 'pink' | 'christmas'
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible'
export type PurchaseType = 'single' | 'bundle' | 'unlimited' | 'ai_pack'
export type AIStyle = 'mandala' | 'floral' | 'animals' | 'abstract' | 'portrait' | 'landscape'
export type AIComplexity = 'simple' | 'medium' | 'detailed'
export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin'
export type VerificationType = 'staff' | 'creator' | 'brand' | 'notable'

export type BlogPostStatus = 'draft' | 'published' | 'archived'

export interface Database {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string
          cover_image_url: string | null
          category: string
          tags: string[]
          author_id: string | null
          status: BlogPostStatus
          published_at: string | null
          read_time_minutes: number
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content: string
          cover_image_url?: string | null
          category?: string
          tags?: string[]
          author_id?: string | null
          status?: BlogPostStatus
          published_at?: string | null
          read_time_minutes?: number
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string | null
          category?: string
          tags?: string[]
          author_id?: string | null
          status?: BlogPostStatus
          published_at?: string | null
          read_time_minutes?: number
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      blog_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          editions_owned: Edition[]
          free_pages_remaining: number
          ai_credits: number
          journal_streak: number
          last_journal_date: string | null
          streak_freeze_available: boolean
          follower_count: number
          following_count: number
          total_likes_received: number
          is_verified: boolean
          verification_type: VerificationType | null
          verified_at: string | null
          verified_by: string | null
          role: UserRole
          is_banned: boolean
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          editions_owned?: Edition[]
          free_pages_remaining?: number
          ai_credits?: number
          journal_streak?: number
          last_journal_date?: string | null
          streak_freeze_available?: boolean
          follower_count?: number
          following_count?: number
          total_likes_received?: number
          is_verified?: boolean
          verification_type?: VerificationType | null
          verified_at?: string | null
          verified_by?: string | null
          role?: UserRole
          is_banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          editions_owned?: Edition[]
          free_pages_remaining?: number
          ai_credits?: number
          journal_streak?: number
          last_journal_date?: string | null
          streak_freeze_available?: boolean
          follower_count?: number
          following_count?: number
          total_likes_received?: number
          is_verified?: boolean
          verification_type?: VerificationType | null
          verified_at?: string | null
          verified_by?: string | null
          role?: UserRole
          is_banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          thumbnail_url: string | null
          caption: string | null
          edition: Edition | null
          page_number: number | null
          is_public: boolean
          like_count: number
          comment_count: number
          is_flagged: boolean
          flag_reason: string | null
          flagged_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          thumbnail_url?: string | null
          caption?: string | null
          edition?: Edition | null
          page_number?: number | null
          is_public?: boolean
          like_count?: number
          comment_count?: number
          is_flagged?: boolean
          flag_reason?: string | null
          flagged_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          thumbnail_url?: string | null
          caption?: string | null
          edition?: Edition | null
          page_number?: number | null
          is_public?: boolean
          like_count?: number
          comment_count?: number
          is_flagged?: boolean
          flag_reason?: string | null
          flagged_at?: string | null
          created_at?: string
        }
      }
      likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          content: string | null
          mood: Mood | null
          prompt_used: string | null
          word_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date: string
          content?: string | null
          mood?: Mood | null
          prompt_used?: string | null
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          content?: string | null
          mood?: Mood | null
          prompt_used?: string | null
          word_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      coloring_pages: {
        Row: {
          id: string
          title: string
          description: string | null
          preview_url: string
          full_url: string
          category: string | null
          is_free: boolean
          price_naira: number
          download_count: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          preview_url: string
          full_url: string
          category?: string | null
          is_free?: boolean
          price_naira?: number
          download_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          preview_url?: string
          full_url?: string
          category?: string | null
          is_free?: boolean
          price_naira?: number
          download_count?: number
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          page_id: string | null
          type: PurchaseType
          amount_naira: number
          paystack_reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          page_id?: string | null
          type: PurchaseType
          amount_naira: number
          paystack_reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          page_id?: string | null
          type?: PurchaseType
          amount_naira?: number
          paystack_reference?: string | null
          created_at?: string
        }
      }
      ai_generations: {
        Row: {
          id: string
          user_id: string
          prompt: string
          style: AIStyle | null
          complexity: AIComplexity | null
          result_url: string | null
          is_purchased: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          style?: AIStyle | null
          complexity?: AIComplexity | null
          result_url?: string | null
          is_purchased?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          style?: AIStyle | null
          complexity?: AIComplexity | null
          result_url?: string | null
          is_purchased?: boolean
          created_at?: string
        }
      }
      reference_images: {
        Row: {
          id: string
          edition: Edition
          page_number: number
          image_url: string
          is_official: boolean
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          edition: Edition
          page_number: number
          image_url: string
          is_official?: boolean
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          edition?: Edition
          page_number?: number
          image_url?: string
          is_official?: boolean
          uploaded_by?: string | null
          created_at?: string
        }
      }
      saved_posts: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          reported_user_id: string | null
          reported_post_id: string | null
          reason: string
          details: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          reported_user_id?: string | null
          reported_post_id?: string | null
          reason: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string | null
          reported_user_id?: string | null
          reported_post_id?: string | null
          reason?: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_blog_view: {
        Args: { post_id: string }
        Returns: undefined
      }
    }
    Enums: {
      edition: Edition
      mood: Mood
      purchase_type: PurchaseType
      ai_style: AIStyle
      ai_complexity: AIComplexity
      user_role: UserRole
    }
  }
}

// Utility types for easier use
export type User = Database['public']['Tables']['users']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type ColoringPage = Database['public']['Tables']['coloring_pages']['Row']
export type Purchase = Database['public']['Tables']['purchases']['Row']
export type AIGeneration = Database['public']['Tables']['ai_generations']['Row']
export type ReferenceImage = Database['public']['Tables']['reference_images']['Row']
export type SavedPost = Database['public']['Tables']['saved_posts']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type BlogCategory = Database['public']['Tables']['blog_categories']['Row']

// Extended types with relations
export type PostWithUser = Post & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'verification_type'>
  is_liked?: boolean
  is_saved?: boolean
}

export type CommentWithUser = Comment & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'verification_type'>
  replies?: CommentWithUser[]
}

export type UserProfile = User & {
  is_following?: boolean
  posts?: Post[]
}
