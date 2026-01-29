import { pgTable, text, uuid, integer, timestamp } from "drizzle-orm/pg-core";

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
  fid: integer("fid").notNull().unique(),
  username: text("username").notNull(),
  tysmBalance: integer("tysm_balance").notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  streakDay: integer("streak_day").notNull().default(1),
  streakWeek: integer("streak_week").notNull().default(1),
  totalStreakDays: integer("total_streak_days").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Claims Table
 * Records all TYSM claim transactions
 */
export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  fid: integer("fid").notNull(),
  username: text("username").notNull(),
  amount: integer("amount").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
