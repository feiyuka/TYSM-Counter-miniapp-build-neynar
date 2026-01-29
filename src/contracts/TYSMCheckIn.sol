// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TYSMCheckIn
 * @notice Daily check-in contract with automatic $TYSM token rewards
 * @dev Rewards based on streak: Day × Week multiplier + bonuses
 *
 * Reward Formula:
 * - Daily reward = streakDay × streakWeek
 * - Week bonus (day 7) = 7 × streakWeek
 * - Day 29 milestone = +500 TYSM
 * - Day 30 milestone = +1000 TYSM
 */
contract TYSMCheckIn {
    // =============================================================
    //                           EVENTS
    // =============================================================

    event CheckIn(
        address indexed user,
        uint256 streakDay,
        uint256 streakWeek,
        uint256 reward,
        uint256 timestamp
    );
    event StreakReset(address indexed user, uint256 timestamp);
    event PoolFunded(address indexed funder, uint256 amount);
    event PoolWithdrawn(address indexed owner, uint256 amount);

    // =============================================================
    //                           STORAGE
    // =============================================================

    IERC20 public immutable tysmToken;
    address public immutable poolWallet;
    address public owner;

    struct UserStreak {
        uint256 lastCheckIn;
        uint256 streakDay;      // 1-7 within a week
        uint256 streakWeek;     // Week number (1, 2, 3, ...)
        uint256 totalCheckIns;  // Total all-time check-ins
        uint256 totalEarned;    // Total TYSM earned
    }

    mapping(address => UserStreak) public userStreaks;

    // Constants
    uint256 public constant COOLDOWN = 20 hours;      // Min time between check-ins
    uint256 public constant STREAK_WINDOW = 48 hours; // Max time before streak resets
    uint256 public constant TYSM_DECIMALS = 18;

    // Milestone bonuses (in whole tokens, will be multiplied by decimals)
    uint256 public constant DAY_29_BONUS = 500;
    uint256 public constant DAY_30_BONUS = 1000;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @param _tysmToken Address of $TYSM token contract
     * @param _poolWallet Address of wallet holding reward pool
     */
    constructor(address _tysmToken, address _poolWallet) {
        tysmToken = IERC20(_tysmToken);
        poolWallet = _poolWallet;
        owner = msg.sender;
    }

    // =============================================================
    //                       MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // =============================================================
    //                      MAIN FUNCTIONS
    // =============================================================

    /**
     * @notice Perform daily check-in and claim $TYSM reward
     * @dev Calculates reward based on current streak, handles week transitions
     */
    function checkIn() external {
        UserStreak storage streak = userStreaks[msg.sender];

        // Check cooldown
        require(
            block.timestamp >= streak.lastCheckIn + COOLDOWN,
            "Already checked in, wait for cooldown"
        );

        // Check if streak should reset (missed more than 48 hours)
        if (streak.lastCheckIn > 0 && block.timestamp > streak.lastCheckIn + STREAK_WINDOW) {
            // Reset streak
            streak.streakDay = 1;
            streak.streakWeek = 1;
            emit StreakReset(msg.sender, block.timestamp);
        } else if (streak.lastCheckIn == 0) {
            // First time user
            streak.streakDay = 1;
            streak.streakWeek = 1;
        } else {
            // Continue streak
            streak.streakDay++;

            // Check for week transition
            if (streak.streakDay > 7) {
                streak.streakDay = 1;
                streak.streakWeek++;
            }
        }

        // Calculate reward
        uint256 reward = _calculateReward(streak.streakDay, streak.streakWeek, streak.totalCheckIns + 1);

        // Update user stats
        streak.lastCheckIn = block.timestamp;
        streak.totalCheckIns++;
        streak.totalEarned += reward;

        // Transfer reward from pool to user
        if (reward > 0) {
            require(
                tysmToken.transferFrom(poolWallet, msg.sender, reward),
                "Reward transfer failed"
            );
        }

        emit CheckIn(msg.sender, streak.streakDay, streak.streakWeek, reward, block.timestamp);
    }

    /**
     * @notice Calculate reward for a check-in
     * @param day Current day in the week (1-7)
     * @param week Current week number
     * @param totalDays Total check-in days for milestone calculation
     */
    function _calculateReward(uint256 day, uint256 week, uint256 totalDays) internal pure returns (uint256) {
        uint256 reward = 0;

        // Base daily reward: day × week
        reward = day * week;

        // Week completion bonus (day 7): +7 × week
        if (day == 7) {
            reward += 7 * week;
        }

        // Milestone bonuses (one-time)
        if (totalDays == 29) {
            reward += DAY_29_BONUS;
        } else if (totalDays == 30) {
            reward += DAY_30_BONUS;
        }

        // Convert to token decimals
        return reward * (10 ** TYSM_DECIMALS);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Check if user can check in now
     * @param user Address to check
     * @return canCheck Whether user can check in
     * @return timeRemaining Seconds until next check-in (0 if can check)
     * @return willReset Whether streak will reset if they check in now
     */
    function canCheckIn(address user) external view returns (
        bool canCheck,
        uint256 timeRemaining,
        bool willReset
    ) {
        UserStreak memory streak = userStreaks[user];

        if (streak.lastCheckIn == 0) {
            return (true, 0, false);
        }

        uint256 nextCheckIn = streak.lastCheckIn + COOLDOWN;
        bool streakExpired = block.timestamp > streak.lastCheckIn + STREAK_WINDOW;

        if (block.timestamp >= nextCheckIn) {
            return (true, 0, streakExpired);
        }

        return (false, nextCheckIn - block.timestamp, streakExpired);
    }

    /**
     * @notice Get user's current streak info
     * @param user Address to query
     */
    function getUserStreak(address user) external view returns (
        uint256 lastCheckIn,
        uint256 streakDay,
        uint256 streakWeek,
        uint256 totalCheckIns,
        uint256 totalEarned
    ) {
        UserStreak memory streak = userStreaks[user];
        return (
            streak.lastCheckIn,
            streak.streakDay,
            streak.streakWeek,
            streak.totalCheckIns,
            streak.totalEarned
        );
    }

    /**
     * @notice Preview reward for next check-in
     * @param user Address to preview for
     */
    function previewReward(address user) external view returns (uint256) {
        UserStreak memory streak = userStreaks[user];

        uint256 day = streak.streakDay;
        uint256 week = streak.streakWeek;
        uint256 totalDays = streak.totalCheckIns + 1;

        // Simulate streak logic
        if (streak.lastCheckIn == 0) {
            day = 1;
            week = 1;
        } else if (block.timestamp > streak.lastCheckIn + STREAK_WINDOW) {
            day = 1;
            week = 1;
        } else {
            day++;
            if (day > 7) {
                day = 1;
                week++;
            }
        }

        return _calculateReward(day, week, totalDays);
    }

    /**
     * @notice Get available pool balance
     */
    function poolBalance() external view returns (uint256) {
        return tysmToken.balanceOf(poolWallet);
    }

    // =============================================================
    //                      OWNER FUNCTIONS
    // =============================================================

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
