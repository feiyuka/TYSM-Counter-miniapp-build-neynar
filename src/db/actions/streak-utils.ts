// Reward formula: streakDay × streakWeek × BOOSTER TYSM
// Contract records the check-in onchain; pool wallet pays out the boosted amount.
// BOOSTER = 100: Week 1 = 100x, Week 2 = 200x, ... Week 52 = 5200x (up to 1 year)
export const MAX_WEEK = 52;
export const BOOSTER = 100;
export const MILESTONE_DAY_29 = 50_000;   // Day 29: +50,000 TYSM (500 × 100 booster)
export const MILESTONE_DAY_30 = 100_000;  // Day 30: +100,000 TYSM (1000 × 100 booster)

/**
 * Calculate reward paid out from the pool wallet.
 *
 * Formula:
 *   dailyReward = streakDay × streakWeek × 100  TYSM
 *   weekBonus   = 7 × streakWeek × 100          TYSM  (on Day 7 completion)
 *   milestone   = 50,000 (Day 29) or 100,000 (Day 30) TYSM
 *
 * Examples:
 *   Day 1, Week 1  → 1 × 1 × 100 = 100 TYSM
 *   Day 3, Week 2  → 3 × 2 × 100 = 600 TYSM
 *   Day 7, Week 1  → 700 daily + 700 bonus = 1,400 TYSM
 *   Day 7, Week 52 → 36,400 daily + 36,400 bonus = 72,800 TYSM
 *
 * @param streakDay         Current day within week (1–7)
 * @param streakWeek        Current week number (1–52+)
 * @param currentTotalDays  Total days BEFORE this check-in
 */
export function calculateReward(streakDay: number, streakWeek: number, currentTotalDays: number) {
  const effectiveWeek = Math.min(streakWeek, MAX_WEEK);
  const dailyReward = streakDay * effectiveWeek * BOOSTER;
  const isLastDayOfWeek = streakDay === 7;
  const weekBonus = isLastDayOfWeek ? 7 * effectiveWeek * BOOSTER : 0;

  // Milestone fires when completing day 29 or day 30
  // currentTotalDays is BEFORE increment → fires when currentTotalDays+1 = 29 or 30
  let milestoneBonus = 0;
  if (currentTotalDays + 1 === 29) milestoneBonus = MILESTONE_DAY_29;
  else if (currentTotalDays + 1 === 30) milestoneBonus = MILESTONE_DAY_30;

  return {
    dailyReward,
    weekBonus,
    milestoneBonus,
    totalReward: dailyReward + weekBonus + milestoneBonus,
    effectiveWeek,
    isLastDayOfWeek,
  };
}
