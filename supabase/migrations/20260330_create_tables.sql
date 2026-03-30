-- =============================================
-- CONTENT INTELLIGENCE - Database Schema
-- =============================================

-- Profiles analyzed
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  full_name TEXT,
  bio TEXT,
  bio_link TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  profile_pic_url TEXT,
  instagram_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(username)
);

-- Batches (each execution)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'scraping' CHECK (status IN ('scraping', 'transcribing', 'classifying', 'analyzing', 'completed', 'failed')),
  total_posts INTEGER DEFAULT 0,
  filtered_posts INTEGER DEFAULT 0,
  transcribed_posts INTEGER DEFAULT 0,
  min_views INTEGER DEFAULT 0,
  min_engagement NUMERIC(5,2) DEFAULT 0,
  top_n INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Posts scraped
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  shortcode TEXT,
  post_type TEXT CHECK (post_type IN ('video', 'carousel', 'image')),
  url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,

  -- Content
  caption TEXT,
  hashtags TEXT[],
  transcript TEXT,

  -- Metrics (raw)
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  video_duration NUMERIC(8,2),

  -- Metrics (derived)
  engagement_rate NUMERIC(8,4),
  comment_to_like_ratio NUMERIC(8,4),
  engagement_velocity NUMERIC(10,2),
  outlier_score NUMERIC(8,2),
  sales_potential_score NUMERIC(8,2),

  -- Classification (filled by Haiku)
  funnel_stage TEXT CHECK (funnel_stage IN ('tofu', 'mofu', 'bofu')),
  hook_type TEXT,
  hook_text TEXT,
  cta_type TEXT CHECK (cta_type IN ('none', 'soft', 'medium', 'hard')),
  cta_text TEXT,
  content_theme TEXT,

  -- Metadata
  posted_at TIMESTAMPTZ,
  drive_file_id TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  classification_status TEXT DEFAULT 'pending' CHECK (classification_status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(batch_id, post_id)
);

-- Comments (scraped and classified)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_username TEXT,
  text TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,

  -- Classification (Haiku)
  intent_type TEXT CHECK (intent_type IN ('purchase_intent', 'objection', 'audience_voice', 'social_proof', 'praise', 'question', 'neutral')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),

  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hook bank (extracted from analysis)
CREATE TABLE hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  hook_text TEXT NOT NULL,
  hook_type TEXT,
  views_count INTEGER,
  engagement_rate NUMERIC(8,4),
  funnel_stage TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analyses (Claude output per batch)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_type TEXT DEFAULT 'full' CHECK (analysis_type IN ('full', 'cross_competitor', 'incremental')),

  -- Structured outputs
  full_analysis TEXT,
  framework_viral TEXT,
  system_prompt_output TEXT,
  performance_summary JSONB,
  funnel_distribution JSONB,
  top_hooks JSONB,
  cta_analysis JSONB,
  audience_insights JSONB,

  -- Meta
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate NUMERIC(8,4),

  google_doc_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content calendar (generated)
CREATE TABLE calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_number INTEGER,
  funnel_stage TEXT,
  topic TEXT,
  hook_angle TEXT,
  cta_type TEXT,
  reference_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_posts_batch ON posts(batch_id);
CREATE INDEX idx_posts_profile ON posts(profile_id);
CREATE INDEX idx_posts_engagement ON posts(engagement_rate DESC NULLS LAST);
CREATE INDEX idx_posts_sales_score ON posts(sales_potential_score DESC NULLS LAST);
CREATE INDEX idx_posts_funnel ON posts(funnel_stage);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_intent ON comments(intent_type);
CREATE INDEX idx_hooks_profile ON hooks(profile_id);
CREATE INDEX idx_analyses_batch ON analyses(batch_id);
CREATE INDEX idx_batches_profile ON batches(profile_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
