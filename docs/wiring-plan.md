# Wiring Plan - TYSM Counter

> Created during Phase 4 (Feature Planning)

## Features Overview

| Feature | Type | Mock | Priority |
|---------|------|------|----------|
| User Streak | database | `MOCK_STREAK` | High |
| User Scores | social | `MOCK_SCORES` | High |
| Pool Stats | database | `MOCK_POOL` | Medium |
| Live Claims | database | `MOCK_LIVE_CLAIMS` | High |
| Leaderboard | database | `MOCK_LEADERBOARD` | High |
| User Profile | social | `MOCK_USER` | High |
| Share Button | sharing | N/A | Required |

## Feature Implementation Details

### 1. User Profile (MOCK_USER)

- **Type**: social
- **Mock**: `MOCK_USER` in `src/data/mocks.ts`
- **Used by**: `check-in-tab.tsx`
- **SDK/Hooks**: `useFarcasterUser()` from `@/neynar-farcaster-sdk/mini`
- **Files to modify**:
  - `src/features/app/components/check-in-tab.tsx`
- **Implementation notes**:
  - Replace mock user with real Farcaster user data
  - Get fid, username, displayName, pfpUrl from SDK
  - Wallet address from connected wallet

### 2. User Scores (MOCK_SCORES)

- **Type**: social
- **Mock**: `MOCK_SCORES` in `src/data/mocks.ts`
- **Used by**: `check-in-tab.tsx`
- **SDK/Hooks**: Neynar API for user scores
- **Files to create**:
  - `src/hooks/use-user-scores.ts`
- **Files to modify**:
  - `src/features/app/components/check-in-tab.tsx`
- **Implementation notes**:
  - Fetch Neynar Score via API
  - Quotient Score might need separate API or mock for now

### 3. User Streak (MOCK_STREAK)

- **Type**: database
- **Mock**: `MOCK_STREAK` in `src/data/mocks.ts`
- **Used by**: `check-in-tab.tsx`
- **SDK/Hooks**: Custom database table + server actions
- **Files to create**:
  - `src/db/schema.ts` - Add `user_streaks` table
  - `src/db/actions/streak-actions.ts`
  - `src/hooks/use-user-streak.ts`
- **Schema**:
  ```typescript
  export const userStreaks = pgTable("user_streaks", {
    id: uuid("id").primaryKey().defaultRandom(),
    fid: integer("fid").notNull().unique(),
    tysmBalance: integer("tysm_balance").notNull().default(0),
    lastCheckIn: timestamp("last_check_in"),
    streakDay: integer("streak_day").notNull().default(1),
    streakWeek: integer("streak_week").notNull().default(1),
    totalStreakDays: integer("total_streak_days").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });
  ```
- **Server Actions**:
  - `getUserStreak(fid)` - Get user's current streak
  - `checkIn(fid, reward)` - Record daily check-in
  - `resetStreak(fid)` - Reset streak if missed day

### 4. Pool Stats (MOCK_POOL)

- **Type**: database
- **Mock**: `MOCK_POOL` in `src/data/mocks.ts`
- **Used by**: `live-claims-tab.tsx`
- **SDK/Hooks**: KV Store for simple config + calculated from claims
- **Files to create**:
  - `src/hooks/use-pool-stats.ts`
- **Implementation notes**:
  - `totalPool` - Store in KV as app config
  - `remainingPool` - Calculate: totalPool - sum(all claims)
  - `totalClaimed` - Calculate: sum(all claims)
  - `totalClaimers` - Calculate: count(distinct fid from claims)

### 5. Live Claims (MOCK_LIVE_CLAIMS)

- **Type**: database
- **Mock**: `MOCK_LIVE_CLAIMS` in `src/data/mocks.ts`
- **Used by**: `live-claims-tab.tsx`
- **SDK/Hooks**: Custom database table + server actions
- **Files to create**:
  - `src/db/schema.ts` - Add `claims` table
  - `src/db/actions/claim-actions.ts`
  - `src/hooks/use-live-claims.ts`
- **Schema**:
  ```typescript
  export const claims = pgTable("claims", {
    id: uuid("id").primaryKey().defaultRandom(),
    fid: integer("fid").notNull(),
    username: text("username").notNull(),
    amount: integer("amount").notNull(),
    txHash: text("tx_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  ```
- **Server Actions**:
  - `getRecentClaims(limit)` - Get latest claims
  - `saveClaim(fid, username, amount, txHash)` - Record new claim
  - `getTotalClaimed()` - Sum of all claims
  - `getTotalClaimers()` - Count unique claimers

### 6. Leaderboard (MOCK_LEADERBOARD)

- **Type**: database
- **Mock**: `MOCK_LEADERBOARD` in `src/data/mocks.ts`
- **Used by**: `leaderboard-tab.tsx`
- **SDK/Hooks**: Query from `user_streaks` table
- **Files to create**:
  - `src/db/actions/leaderboard-actions.ts`
  - `src/hooks/use-leaderboard.ts`
- **Server Actions**:
  - `getTopClaimers(limit)` - Get top users by total TYSM
  - `getUserRank(fid)` - Get user's rank position
- **Implementation notes**:
  - Query `user_streaks` ordered by `tysmBalance` DESC
  - Calculate tier based on balanced scores

### 7. Share Button (MANDATORY)

- **Type**: sharing
- **Delegate to**: `share-manager` subagent
- **Personalization data available**:
  - `streak` - Current streak day/week
  - `tysmBalance` - Total TYSM earned
  - `tier` - User's tier (LEGENDARY, DIAMOND, etc.)
  - `username` - Farcaster username
- **Component**: `src/features/app/components/check-in-tab.tsx`
- **Share context**:
  - Share after successful check-in
  - Show streak, tier, and TYSM earned

## Database Schema Summary

Two new tables to add to `src/db/schema.ts`:

1. **user_streaks** - Tracks each user's streak progress
2. **claims** - Records all claim transactions

## Implementation Order

1. **Database Schema** - Add tables first
2. **Server Actions** - Create all CRUD operations
3. **User Profile** - Wire Farcaster SDK
4. **User Scores** - Wire Neynar Score API
5. **User Streak** - Wire to database
6. **Live Claims** - Wire to database
7. **Leaderboard** - Wire to database
8. **Pool Stats** - Calculate from claims
9. **Share Button** - Delegate to share-manager

## Notes

- **Token Integration**: Token contract address needed for actual onchain transactions
- **Pool Funding**: User needs to fund the pool wallet with TYSM tokens
- **Score Balance**: Quotient Score API may need clarification from user
