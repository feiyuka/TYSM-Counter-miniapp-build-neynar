# Requirements - TYSM Counter

> **Created**: 2024-01-28
> **Last Updated**: 2024-01-28

---

## App Overview

| Field               | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| **Type**            | Rewards / Check-in App                                   |
| **Target Audience** | Farcaster users who want to earn $TYSM tokens            |
| **Core Experience** | Daily onchain check-in to earn streak-based $TYSM rewards |

---

## Visual Style

| Field               | Value                           |
| ------------------- | ------------------------------- |
| **Vibe**            | Professional, clean, crypto     |
| **Colors**          | TBD (to be decided in theming)  |
| **Style Direction** | Similar to Degen Counter        |

**User's Words**: "buat seperti degen counter"

---

## Core Features

### Must-Have (Phase 3 Priority: High)

- [x] **Score Balance Check**: Neynar Score & Quotient Score must be balanced (≤10% difference) to qualify
- [x] **Tier System**: LEGENDARY, DIAMOND, GOLD, SILVER, BRONZE based on balanced average score
- [x] **Daily Onchain Check-in**: Button → Confirm popup → Transaction → Success popup with tx hash
- [x] **Streak Reward System**: Daily reward = Day × Week Multiplier
- [x] **Week Bonus**: 7 × Week Multiplier on completing 7 days
- [x] **1 Month Milestones**: Day 29 (+500), Day 30 (+1000) one-time bonuses
- [x] **Streak Reset**: Miss a day = reset to Week 1, Day 1
- [x] **Countdown Timer**: Shows time until next check-in (00:00 UTC reset)
- [x] **Streak Reminder**: Warning when <1 hour before reset
- [x] **Live Claims Tab**: Pool stats + live feed of claims with tx hashes
- [x] **Leaderboard Tab**: Top 10 claimers + user's rank
- [x] **My Progress**: Week 1-4 progress bars + milestone tracking
- [x] **How Streaks Work**: Explanation of reward system

### Nice-to-Have (Phase 3 Priority: Medium)

- [ ] **Notification Reminder**: Push notification before streak reset

### Future Considerations (Not in Current Scope)

- **More Milestones**: Additional milestones after 1 month (user wants 1 month only for now)

---

## Data Requirements

| Field                 | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| **Persistence**       | Yes - streak data, claim history, balances              |
| **What Needs Saving** | streak day/week, total days, $TYSM balance, claim history |
| **User-Specific**     | Yes - per-user streak and balance                       |
| **Authentication**    | Farcaster login + wallet for onchain transactions       |

---

## Sharing Configuration

| Field                      | Value                                              |
| -------------------------- | -------------------------------------------------- |
| **Share Button Placement** | After successful check-in (claim success state)    |
| **shareButtonTitle**       | "Claim $TYSM"                                      |
| **Personalization Data**   | Streak day, week, tier, $TYSM earned               |

---

## Technical Constraints

| Field                    | Value                                          |
| ------------------------ | ---------------------------------------------- |
| **User Skill Level**     | Beginner (non-dev user)                        |
| **Platform Focus**       | Mobile-first (Farcaster mini app)              |
| **Special Requirements** | Onchain transactions on Base Network           |

---

## Design Decisions & Rationale

| Decision                          | Rationale                              | Phase   |
| --------------------------------- | -------------------------------------- | ------- |
| Remove grid 7 days display        | Keep UI clean and simple               | Phase 1 |
| Popup flow for check-in           | Better UX than inline confirmation     | Phase 1 |
| No + sign in reward displays      | User preference for cleaner numbers    | Phase 1 |
| Milestones only Day 29 & 30       | 1 month focus, can expand later        | Phase 1 |
| Streak continues up to 1 year     | Multiplier keeps growing indefinitely  | Phase 1 |

---

## Open Questions

- [x] ~~How many milestones?~~ → Day 29 (500) and Day 30 (1000) only
- [x] ~~Week 5+ behavior?~~ → Multiplier continues growing, streak up to 1 year

---

## Change Log

| Timestamp  | Phase   | Description                                    |
| ---------- | ------- | ---------------------------------------------- |
| 2024-01-28 | Phase 1 | Initial sketch created                         |
| 2024-01-28 | Phase 1 | Added popup flow for check-in                  |
| 2024-01-28 | Phase 1 | Removed grid 7 days, simplified UI             |
| 2024-01-28 | Phase 1 | User approved sketch, ready for theming        |
