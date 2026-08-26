// Deliberately simple for v1 — a tier multiplier times a placement score.
// Tune these two tables as you see how real results shake out. Once you're
// ready for a rolling time window (points expiring after 12 months), filter
// results by competition date before calling buildRankings() in rankings.js.

export const TIER_MULTIPLIER = {
  county: 1,
  national: 2,
  continental: 3,
  international: 4,
};

export const PLACEMENT_SCORE = {
  1: 100,
  2: 60,
  3: 40,
};

export function pointsForResult(placement, tier) {
  const tierKey = (tier || "").trim().toLowerCase();
  const placementNum = parseInt(placement, 10);
  const base = PLACEMENT_SCORE[placementNum] || 0;
  const multiplier = TIER_MULTIPLIER[tierKey] || 0;
  return base * multiplier;
}

export function medalForPlacement(placement) {
  const p = parseInt(placement, 10);
  if (p === 1) return "gold";
  if (p === 2) return "silver";
  if (p === 3) return "bronze";
  return "na";
}
