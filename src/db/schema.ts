import { pgTable, text, uuid, integer, bigint, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Key-Value Store Table
 *
 * Built-in table for simple key-value storage.
 * Available immediately without schema changes.
 *
 * ⚠️ CRITICAL: DO NOT DELETE OR EDIT THIS TABLE DEFINITION ⚠️
 * This table is required for the app to function properly.
 * DO NOT delete, modify, rename, or change any part of this table.
 * Removing or editing it will cause database schema conflicts and prevent
 * the app from starting.
 *
 * Use for:
 * - User preferences/settings
 * - App configuration
 * - Simple counters
 * - Temporary data
 */
export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * User Streaks Table
 * Tracks each user's daily check-in streak and TYSM balance
 */
export const userStreaks = pgTable("user_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  fid: bigint("fid", { mode: "number" }).notNull().unique(),
  username: text("username").notNull(),
  pfpUrl: text("pfp_url"),
  tysmBalance: bigint("tysm_balance", { mode: "number" }).notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  streakDay: integer("streak_day").notNull().default(1),
  streakWeek: integer("streak_week").notNull().default(1),
  totalStreakDays: integer("total_streak_days").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // Speed up leaderboard queries (sort by balance DESC)
  index("user_streaks_tysm_balance_idx").on(t.tysmBalance),
  // Speed up cron queries (find users by lastCheckIn range)
  index("user_streaks_last_check_in_idx").on(t.lastCheckIn),
  // Speed up active-user counts
  index("user_streaks_updated_at_idx").on(t.updatedAt),
]);

/**
 * Claims Table
 * Records all TYSM claim transactions
 */
export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  fid: bigint("fid", { mode: "number" }).notNull(),
  username: text("username").notNull(),
  pfpUrl: text("pfp_url"),
  amount: bigint("amount", { mode: "number" }).notNull(),
  txHash: text("tx_hash").notNull().unique(), // unique prevents double-claim with same txHash
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  // Speed up live feed queries (sort by createdAt DESC)
  index("claims_created_at_idx").on(t.createdAt),
  // Speed up per-user claim history
  index("claims_fid_idx").on(t.fid),
]);
