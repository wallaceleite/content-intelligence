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

export function calculateDerivedMetrics(
  post: RawPostMetrics,
  profileAvgEngagement: number
): DerivedMetrics {
  const views = post.views || 1;
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const shares = post.shares || 0;
  const saves = post.saves || 0;

  const totalEngagement = likes + comments + shares + saves;

  // Engagement Rate (%)
  const engagementRate = (totalEngagement / views) * 100;

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
  // Saves (5x) > Comments with high ratio (3x) > Shares (2x) > Likes (1x)
  const salesPotentialScore =
    (saves * 5 + comments * 3 * Math.min(commentToLikeRatio, 1) + shares * 2 + likes) /
    Math.max(views, 1) *
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
  topN?: number
): T[] {
  let filtered = posts.filter((p) => {
    const views = p.views || 1;
    const engagement = ((p.likes + p.comments) / views) * 100;
    return views >= minViews && engagement >= minEngagement;
  });

  // Sort by engagement rate descending
  filtered.sort((a, b) => {
    const ea = ((a.likes + a.comments) / (a.views || 1)) * 100;
    const eb = ((b.likes + b.comments) / (b.views || 1)) * 100;
    return eb - ea;
  });

  if (topN && topN > 0) {
    filtered = filtered.slice(0, topN);
  }

  return filtered;
}
