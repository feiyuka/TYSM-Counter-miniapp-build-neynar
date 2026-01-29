// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TYSMCheckIn
 * @notice Daily check-in contract with automatic $TYSM token rewards
 * @dev Contract holds TYSM balance directly - no approval needed
 */
contract TYSMCheckIn {
    // =============================================================
    //                         IERC20 INTERFACE
    // =============================================================

    interface IERC20 {
        function transfer(address to, uint256 amount) external returns (bool);
        function balanceOf(address account) external view returns (uint256);
    }

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
    event FundsWithdrawn(address indexed to, uint256 amount);

    // =============================================================
    //                           STORAGE
    // =============================================================

    IERC20 public immutable tysmToken;
    address public owner;

    struct UserStreak {
        uint256 lastCheckIn;
        uint256 streakDay;
        uint256 streakWeek;
        uint256 totalCheckIns;
        uint256 totalEarned;
    }

    mapping(address => UserStreak) public userStreaks;

    uint256 public constant COOLDOWN = 20 hours;
    uint256 public constant STREAK_WINDOW = 48 hours;
    uint256 public constant TYSM_DECIMALS = 18;
    uint256 public constant DAY_29_BONUS = 500;
    uint256 public constant DAY_30_BONUS = 1000;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(address _tysmToken) {
        tysmToken = IERC20(_tysmToken);
        owner = msg.sender;
    }

    // =============================================================
    //                         MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // =============================================================
    //                      MAIN FUNCTIONS
    // =============================================================

    function checkIn() external {
        UserStreak storage streak = userStreaks[msg.sender];
        require(block.timestamp >= streak.lastCheckIn + COOLDOWN, "Already checked in, wait for cooldown");

        if (streak.lastCheckIn > 0 && block.timestamp > streak.lastCheckIn + STREAK_WINDOW) {
            streak.streakDay = 1;
            streak.streakWeek = 1;
            emit StreakReset(msg.sender, block.timestamp);
        } else if (streak.lastCheckIn == 0) {
            streak.streakDay = 1;
            streak.streakWeek = 1;
        } else {
            streak.streakDay++;
            if (streak.streakDay > 7) {
                streak.streakDay = 1;
                streak.streakWeek++;
            }
        }

        uint256 reward = _calculateReward(streak.streakDay, streak.streakWeek, streak.totalCheckIns + 1);
        streak.lastCheckIn = block.timestamp;
        streak.totalCheckIns++;
        streak.totalEarned += reward;

        if (reward > 0) {
            require(tysmToken.transfer(msg.sender, reward), "Reward transfer failed");
        }

        emit CheckIn(msg.sender, streak.streakDay, streak.streakWeek, reward, block.timestamp);
    }

    function _calculateReward(uint256 day, uint256 week, uint256 totalDays) internal pure returns (uint256) {
        uint256 reward = day * week;
        if (day == 7) reward += 7 * week;
        if (totalDays == 29) reward += DAY_29_BONUS;
        else if (totalDays == 30) reward += DAY_30_BONUS;
        return reward * (10 ** TYSM_DECIMALS);
    }

    // =============================================================
    //                      OWNER FUNCTIONS
    // =============================================================

    /// @notice Withdraw TYSM tokens from contract (owner only)
    function withdrawFunds(address to, uint256 amount) external onlyOwner {
        require(tysmToken.transfer(to, amount), "Withdraw failed");
        emit FundsWithdrawn(to, amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    function canCheckIn(address user) external view returns (bool canCheck, uint256 timeRemaining, bool willReset) {
        UserStreak memory streak = userStreaks[user];
        if (streak.lastCheckIn == 0) return (true, 0, false);
        uint256 nextCheckIn = streak.lastCheckIn + COOLDOWN;
        bool streakExpired = block.timestamp > streak.lastCheckIn + STREAK_WINDOW;
        if (block.timestamp >= nextCheckIn) return (true, 0, streakExpired);
        return (false, nextCheckIn - block.timestamp, streakExpired);
    }

    function getUserStreak(address user) external view returns (
        uint256 lastCheckIn,
        uint256 streakDay,
        uint256 streakWeek,
        uint256 totalCheckIns,
        uint256 totalEarned
    ) {
        UserStreak memory streak = userStreaks[user];
        return (streak.lastCheckIn, streak.streakDay, streak.streakWeek, streak.totalCheckIns, streak.totalEarned);
    }

    function previewReward(address user) external view returns (uint256) {
        UserStreak memory streak = userStreaks[user];
        uint256 day = streak.streakDay;
        uint256 week = streak.streakWeek;
        uint256 totalDays = streak.totalCheckIns + 1;
        if (streak.lastCheckIn == 0) { day = 1; week = 1; }
        else if (block.timestamp > streak.lastCheckIn + STREAK_WINDOW) { day = 1; week = 1; }
        else { day++; if (day > 7) { day = 1; week++; } }
        return _calculateReward(day, week, totalDays);
    }

    /// @notice Check contract's TYSM balance (pool balance)
    function poolBalance() external view returns (uint256) {
        return tysmToken.balanceOf(address(this));
    }

    // =============================================================
    //                      RECEIVE FUNCTION
    // =============================================================

    /// @notice Allow contract to receive ETH (for gas if needed)
    receive() external payable {}
}
