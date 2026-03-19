'use server';

import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Shared constants — single source of truth for reward calculation
export const REWARD_MULTIPLIER = 100;
export const MAX_WEEK = 52;
export const MILESTONE_DAY_29 = 50_000;
export const MILESTONE_DAY_30 = 100_000;

/**
 * Get UTC date string "YYYY-MM-DD" — ensures consistent timezone handling
 */
function getUTCDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get user's current streak data
 */
export async function getUserStreak(fid: number) {
  const result = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.fid, fid))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create or get user streak record
 */
export async function getOrCreateUserStreak(fid: number, username: string, pfpUrl?: string) {
  const existing = await getUserStreak(fid);

  if (existing) {
    // Update username/pfpUrl if changed
    const needsUpdate = existing.username !== username || (pfpUrl && existing.pfpUrl !== pfpUrl);
    if (needsUpdate) {
      await db
        .update(userStreaks)
        .set({ username, pfpUrl: pfpUrl ?? existing.pfpUrl ?? undefined, updatedAt: new Date() })
        .where(eq(userStreaks.fid, fid));
      return getUserStreak(fid);
    }
    return existing;
  }

  // Create new user record
  await db.insert(userStreaks).values({
    fid,
    username,
    pfpUrl,
    tysmBalance: 0,
    streakDay: 1,
    streakWeek: 1,
    totalStreakDays: 0,
  });

  return getUserStreak(fid);
}

/**
 * Check if user can check in today (UTC day boundary)
 */
export async function canCheckInToday(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return true;

  const lastDay = getUTCDateString(new Date(streak.lastCheckIn));
  const todayDay = getUTCDateString(new Date());

  return lastDay < todayDay;
}

/**
 * Check if user missed a day (more than 1 UTC day gap → streak should reset)
 */
export async function shouldResetStreak(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return false;

  const lastDay = getUTCDateString(new Date(streak.lastCheckIn));
  const todayDay = getUTCDateString(new Date());

  const last = new Date(lastDay + 'T00:00:00Z');
  const today = new Date(todayDay + 'T00:00:00Z');
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays > 1;
}

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

/**
 * Perform daily check-in.
 * Returns reward amount and updated streak data.
 */
export async function performCheckIn(fid: number, username: string, pfpUrl?: string) {
  const streak = await getOrCreateUserStreak(fid, username, pfpUrl);
  if (!streak) throw new Error('Failed to create user streak');

  // Check if already checked in today (UTC)
  const canCheck = await canCheckInToday(fid);
  if (!canCheck) {
    return { success: false as const, error: 'Already checked in today', streak };
  }

  // Check if streak should reset (missed a day)
  const needsReset = await shouldResetStreak(fid);

  // Determine streak values for THIS check-in
  let checkInStreakDay = streak.streakDay;
  let checkInStreakWeek = streak.streakWeek;
  let checkInTotalDays = streak.totalStreakDays;

  if (needsReset) {
    checkInStreakDay = 1;
    checkInStreakWeek = 1;
    checkInTotalDays = 0; // will become 1 after increment
  }

  // Calculate reward using this check-in's streak state
  const rewardCalc = calculateReward(checkInStreakDay, checkInStreakWeek, checkInTotalDays);

  // Advance streak values for next check-in
  const nextStreakDay = rewardCalc.isLastDayOfWeek ? 1 : checkInStreakDay + 1;
  const nextStreakWeek = rewardCalc.isLastDayOfWeek ? checkInStreakWeek + 1 : checkInStreakWeek;
  const nextTotalDays = checkInTotalDays + 1;

  await db
    .update(userStreaks)
    .set({
      tysmBalance: streak.tysmBalance + rewardCalc.totalReward,
      lastCheckIn: new Date(),
      streakDay: nextStreakDay,
      streakWeek: nextStreakWeek,
      totalStreakDays: nextTotalDays,
      updatedAt: new Date(),
    })
    .where(eq(userStreaks.fid, fid));

  const updatedStreak = await getUserStreak(fid);

  return {
    success: true as const,
    reward: rewardCalc.totalReward,
    dailyReward: rewardCalc.dailyReward,
    weekBonus: rewardCalc.weekBonus,
    milestoneBonus: rewardCalc.milestoneBonus,
    streak: updatedStreak,
    wasReset: needsReset,
  };
}

/**
 * Update user's TYSM balance (manual adjustment)
 */
export async function updateTysmBalance(fid: number, newBalance: number) {
  await db
    .update(userStreaks)
    .set({ tysmBalance: newBalance, updatedAt: new Date() })
    .where(eq(userStreaks.fid, fid));
}
