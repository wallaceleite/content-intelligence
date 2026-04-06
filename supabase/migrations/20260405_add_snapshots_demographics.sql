-- Daily snapshots for followers/reach/engagement tracking
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  avg_engagement NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_profile_date
  ON daily_snapshots(profile_id, snapshot_date DESC);

-- Demographics cache (refreshed on sync)
CREATE TABLE IF NOT EXISTS audience_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, metric_type, dimension)
);

CREATE INDEX IF NOT EXISTS idx_demographics_profile_type
  ON audience_demographics(profile_id, metric_type);

-- Backfill daily_snapshots from strategy_weekly (if data exists)
INSERT INTO daily_snapshots (profile_id, snapshot_date, followers_count)
SELECT
  p.id,
  sw.week_start,
  sw.followers_count
FROM strategy_weekly sw
CROSS JOIN profiles p
WHERE p.username = 'owallaceleite' AND sw.followers_count > 0
ON CONFLICT (profile_id, snapshot_date) DO NOTHING;
