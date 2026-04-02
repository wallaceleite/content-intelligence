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

/** Use views if available; otherwise use likes as minimum reach proxy */
function getBaseMetric(views: number, likes: number): number {
  return views > 0 ? views : likes > 0 ? likes : 1;
}

export function calculateDerivedMetrics(
  post: RawPostMetrics,
  profileAvgEngagement: number
): DerivedMetrics {
  const views = post.views || 0;
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const shares = post.shares || 0;
  const saves = post.saves || 0;

  const totalEngagement = likes + comments + shares + saves;
  const base = getBaseMetric(views, likes);

  // Engagement Rate (%) — capped at 100%
  const engagementRate = Math.min((totalEngagement / base) * 100, 100);

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

  // Sales Potential Score (weighted composite) — capped at 100%
  const salesPotentialScore = Math.min(
    (saves * 5 + comments * 3 * Math.min(commentToLikeRatio, 1) + shares * 2 + likes) /
      base *
      100,
    100
  );

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
    const base = getBaseMetric(p.views, p.likes);
    const engagement = Math.min(((p.likes + p.comments) / base) * 100, 100);
    return p.views >= minViews && engagement >= minEngagement;
  });

  // Sort by engagement rate descending
  filtered.sort((a, b) => {
    const baseA = getBaseMetric(a.views, a.likes);
    const baseB = getBaseMetric(b.views, b.likes);
    const ea = Math.min(((a.likes + a.comments) / baseA) * 100, 100);
    const eb = Math.min(((b.likes + b.comments) / baseB) * 100, 100);
    return eb - ea;
  });

  if (topN && topN > 0) {
    filtered = filtered.slice(0, topN);
  }

  return filtered;
}
