'use server';

import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateReward } from '@/db/actions/streak-utils';

/**
 * Contract constants (read from Base Network):
 * COOLDOWN = 72000 seconds (20 hours) — minimum time between check-ins
 * STREAK_WINDOW = 172800 seconds (48 hours) — max gap before streak resets
 *
 * We use these server-side so DB logic stays in sync with contract behavior.
 */
const COOLDOWN_MS = 72_000 * 1000;       // 20 hours in ms
const STREAK_WINDOW_MS = 172_800 * 1000; // 48 hours in ms

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
 * Check if user can check in based on contract COOLDOWN (20 hours).
 * Uses lastCheckIn timestamp from DB — same logic as contract.
 */
export async function canCheckInToday(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return true;

  const lastCheckInMs = new Date(streak.lastCheckIn).getTime();
  const nowMs = Date.now();

  return (nowMs - lastCheckInMs) >= COOLDOWN_MS;
}

/**
 * Check if user missed the streak window (48 hours gap → streak resets).
 * Matches contract STREAK_WINDOW logic.
 */
export async function shouldResetStreak(fid: number): Promise<boolean> {
  const streak = await getUserStreak(fid);
  if (!streak || !streak.lastCheckIn) return false;

  const lastCheckInMs = new Date(streak.lastCheckIn).getTime();
  const nowMs = Date.now();

  return (nowMs - lastCheckInMs) > STREAK_WINDOW_MS;
}

/**
 * Perform daily check-in.
 * Returns reward amount and updated streak data.
 */
export async function performCheckIn(fid: number, username: string, pfpUrl?: string) {
  const streak = await getOrCreateUserStreak(fid, username, pfpUrl);
  if (!streak) throw new Error('Failed to create user streak');

  // Check cooldown (20h) — must match contract
  const canCheck = await canCheckInToday(fid);
  if (!canCheck) {
    return { success: false as const, error: 'Cooldown active — check in again after 20 hours', streak };
  }

  // Check if streak should reset (48h window exceeded)
  const needsReset = await shouldResetStreak(fid);

  // Determine streak values for THIS check-in
  let checkInStreakDay = streak.streakDay;
  let checkInStreakWeek = streak.streakWeek;
  let checkInTotalDays = streak.totalStreakDays;

  if (needsReset) {
    checkInStreakDay = 1;
    checkInStreakWeek = 1;
    checkInTotalDays = 0;
  }

  // Calculate reward
  const rewardCalc = calculateReward(checkInStreakDay, checkInStreakWeek, checkInTotalDays);

  // Advance streak: Day 7 → next week
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
