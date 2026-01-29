'use server';

import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
export async function getOrCreateUserStreak(fid: number, username: string) {
  const existing = await getUserStreak(fid);
  if (existing) return existing;

  // Create new user
  await db.insert(userStreaks).values({
    fid,
    username,
    tysmBalance: 0,
    streakDay: 1,
    streakWeek: 1,
    totalStreakDays: 0,
  });

  return getUserStreak(fid);
}

/**
 * Check if user can check in today (not already checked in today)
 */
export async function canCheckInToday(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return true;

  const lastCheckIn = new Date(streak.lastCheckIn);
  const today = new Date();

  // Reset to start of day in UTC
  const lastCheckInDay = new Date(Date.UTC(
    lastCheckIn.getUTCFullYear(),
    lastCheckIn.getUTCMonth(),
    lastCheckIn.getUTCDate()
  ));
  const todayDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));

  return lastCheckInDay.getTime() < todayDay.getTime();
}

/**
 * Check if user missed a day (streak should reset)
 */
export async function shouldResetStreak(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return false;

  const lastCheckIn = new Date(streak.lastCheckIn);
  const today = new Date();

  // Calculate days difference
  const diffTime = today.getTime() - lastCheckIn.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If more than 1 day passed, reset streak
  return diffDays > 1;
}

/**
 * Perform daily check-in
 * Returns the reward amount and new streak data
 */
export async function performCheckIn(fid: number, username: string) {
  // Get or create user
  let streak = await getOrCreateUserStreak(fid, username);
  if (!streak) throw new Error('Failed to create user streak');

  // Check if already checked in today
  const canCheck = await canCheckInToday(fid);
  if (!canCheck) {
    return { success: false, error: 'Already checked in today', streak };
  }

  // Check if need to reset streak (missed a day)
  const needsReset = await shouldResetStreak(fid);

  let newStreakDay = streak.streakDay;
  let newStreakWeek = streak.streakWeek;
  let newTotalDays = streak.totalStreakDays;

  if (needsReset) {
    // Reset to Week 1, Day 1
    newStreakDay = 1;
    newStreakWeek = 1;
    newTotalDays = 0;
  }

  // Calculate reward
  const dailyReward = newStreakDay * newStreakWeek;
  const isLastDayOfWeek = newStreakDay === 7;
  const weekBonus = isLastDayOfWeek ? 7 * newStreakWeek : 0;

  // Milestone bonuses (Day 29 = 500, Day 30 = 1000)
  let milestoneBonus = 0;
  if (newTotalDays + 1 === 29) milestoneBonus = 500;
  if (newTotalDays + 1 === 30) milestoneBonus = 1000;

  const totalReward = dailyReward + weekBonus + milestoneBonus;

  // Update streak
  const updatedStreakDay = isLastDayOfWeek ? 1 : newStreakDay + 1;
  const updatedStreakWeek = isLastDayOfWeek ? newStreakWeek + 1 : newStreakWeek;

  await db
    .update(userStreaks)
    .set({
      tysmBalance: streak.tysmBalance + totalReward,
      lastCheckIn: new Date(),
      streakDay: updatedStreakDay,
      streakWeek: updatedStreakWeek,
      totalStreakDays: newTotalDays + 1,
      updatedAt: new Date(),
    })
    .where(eq(userStreaks.fid, fid));

  // Get updated streak
  const updatedStreak = await getUserStreak(fid);

  return {
    success: true,
    reward: totalReward,
    dailyReward,
    weekBonus,
    milestoneBonus,
    streak: updatedStreak,
    wasReset: needsReset,
  };
}

/**
 * Update user's TYSM balance (for manual adjustments or onchain sync)
 */
export async function updateTysmBalance(fid: number, newBalance: number) {
  await db
    .update(userStreaks)
    .set({
      tysmBalance: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(userStreaks.fid, fid));
}
