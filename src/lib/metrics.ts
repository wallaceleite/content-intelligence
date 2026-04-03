export interface RawPostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  plays?: number;
  duration?: number;
  postedAt?: string;
}

export interface DerivedMetrics {
  engagementRate: number;
  commentToLikeRatio: number;
  engagementVelocity: number;
  outlierScore: number;
  salesPotentialScore: number;
}

/**
 * Determine the base metric for engagement rate calculation.
 * - If views > 0: use max(views, followers) to prevent >100% on viral low-view posts
 * - If views = 0: use followers (standard for carousels/images)
 * - Fallback: use likes (minimum proxy)
 */
function getBaseMetric(views: number, followersCount: number, likes: number): number {
  if (views > 0) return followersCount > 0 ? Math.max(views, followersCount) : views;
  if (followersCount > 0) return followersCount;
  return likes > 0 ? likes : 1;
}

export function calculateDerivedMetrics(
  post: RawPostMetrics,
  profileAvgEngagement: number,
  followersCount: number = 0
): DerivedMetrics {
  const views = post.views || 0;
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const shares = post.shares || 0;
  const saves = post.saves || 0;

  const totalEngagement = likes + comments + shares + saves;
  const base = getBaseMetric(views, followersCount, likes);

  // Engagement Rate (%)
  const engagementRate = (totalEngagement / base) * 100;

  // Comment-to-Like Ratio — high = conversational/polarizing content
  const commentToLikeRatio = likes > 0 ? comments / likes : 0;

  // Engagement Velocity — engagement per hour (first 24h estimate)
  const hoursOld = post.postedAt
    ? Math.max(1, (Date.now() - new Date(post.postedAt).getTime()) / 3600000)
    : 24;
  const cappedHours = Math.min(hoursOld, 24);
  const engagementVelocity = totalEngagement / cappedHours;

  // Outlier Score — how many X above average
  const outlierScore =
    profileAvgEngagement > 0 ? engagementRate / profileAvgEngagement : 1;

  // Sales Potential Score (weighted composite)
  const salesPotentialScore =
    (saves * 5 + comments * 3 * Math.min(commentToLikeRatio, 1) + shares * 2 + likes) /
    base *
    100;

  return {
    engagementRate: round(engagementRate, 4),
    commentToLikeRatio: round(commentToLikeRatio, 4),
    engagementVelocity: round(engagementVelocity, 2),
    outlierScore: round(outlierScore, 2),
    salesPotentialScore: round(salesPotentialScore, 2),
  };
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function filterAndRankPosts<
  T extends { views: number; likes: number; comments: number }
>(
  posts: T[],
  minViews: number,
  minEngagement: number,
  topN?: number,
  followersCount: number = 0
): T[] {
  let filtered = posts.filter((p) => {
    const base = getBaseMetric(p.views, followersCount, p.likes);
    const engagement = ((p.likes + p.comments) / base) * 100;
    return p.views >= minViews && engagement >= minEngagement;
  });

  // Sort by engagement rate descending
  filtered.sort((a, b) => {
    const baseA = getBaseMetric(a.views, followersCount, a.likes);
    const baseB = getBaseMetric(b.views, followersCount, b.likes);
    const ea = ((a.likes + a.comments) / baseA) * 100;
    const eb = ((b.likes + b.comments) / baseB) * 100;
    return eb - ea;
  });

  if (topN && topN > 0) {
    filtered = filtered.slice(0, topN);
  }

  return filtered;
}
