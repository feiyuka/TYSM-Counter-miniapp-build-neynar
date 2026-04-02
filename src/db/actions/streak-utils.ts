// Shared constants — single source of truth for reward calculation
export const REWARD_MULTIPLIER = 100;
export const MAX_WEEK = 52;
export const MILESTONE_DAY_29 = 500;    // Day 29: +500 TYSM one-time bonus
export const MILESTONE_DAY_30 = 1_000;  // Day 30: +1000 TYSM one-time bonus

/**
 * Calculate reward for given streak state.
 * Uses currentTotalDays (BEFORE incrementing) to determine milestone.
 */
export function calculateReward(streakDay: number, streakWeek: number, currentTotalDays: number) {
  const effectiveWeek = Math.min(streakWeek, MAX_WEEK);
  const dailyReward = streakDay * effectiveWeek * REWARD_MULTIPLIER;
  const isLastDayOfWeek = streakDay === 7;
  const weekBonus = isLastDayOfWeek ? 7 * effectiveWeek * REWARD_MULTIPLIER : 0;

  // Milestone fires on the day COMPLETING day 29 or 30
  // currentTotalDays is before increment, so milestone when currentTotalDays+1 = 29 or 30
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
