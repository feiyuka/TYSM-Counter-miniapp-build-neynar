// Reward formula: day × week × 100 TYSM
// Week multiplier displayed as weekNumber × 100 (e.g. Week 1 = 100x, Week 2 = 200x)
// Day 7 completion bonus = 7 × week × 100 extra TYSM
export const MAX_WEEK = 52;
export const REWARD_MULTIPLIER = 100;
export const MILESTONE_DAY_29 = 500;   // Day 29: +500 TYSM one-time bonus
export const MILESTONE_DAY_30 = 1_000; // Day 30: +1000 TYSM one-time bonus

/**
 * Calculate reward for a given streak state.
 *
 * Formula:
 *   dailyReward = streakDay × streakWeek × 100
 *   weekBonus   = 7 × streakWeek × 100  (on Day 7 completion)
 *   milestone   = 500 (Day 29) or 1000 (Day 30)
 *
 * @param streakDay         Current day within week (1–7)
 * @param streakWeek        Current week number (1–52)
 * @param currentTotalDays  Total days BEFORE this check-in
 */
export function calculateReward(streakDay: number, streakWeek: number, currentTotalDays: number) {
  const effectiveWeek = Math.min(streakWeek, MAX_WEEK);
  const dailyReward = streakDay * effectiveWeek * REWARD_MULTIPLIER;
  const isLastDayOfWeek = streakDay === 7;
  const weekBonus = isLastDayOfWeek ? 7 * effectiveWeek * REWARD_MULTIPLIER : 0;

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
