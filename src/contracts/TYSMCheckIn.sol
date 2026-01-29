// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TYSMCheckIn
 * @notice Simple daily check-in contract for TYSM Counter app
 * @dev Records check-ins on Base Network with daily cooldown
 */
contract TYSMCheckIn {
    // Events
    event CheckIn(address indexed user, uint256 timestamp, uint256 totalCheckIns);

    // Storage
    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public totalCheckIns;

    // Constants
    uint256 public constant COOLDOWN = 20 hours; // Slightly less than 24h for timezone flexibility

    /**
     * @notice Perform a daily check-in
     * @dev Reverts if user has already checked in within cooldown period
     */
    function checkIn() external {
        require(
            block.timestamp >= lastCheckIn[msg.sender] + COOLDOWN,
            "Already checked in today"
        );

        lastCheckIn[msg.sender] = block.timestamp;
        totalCheckIns[msg.sender]++;

        emit CheckIn(msg.sender, block.timestamp, totalCheckIns[msg.sender]);
    }

    /**
     * @notice Check if user can check in now
     * @param user Address to check
     * @return canCheck Whether user can check in
     * @return timeRemaining Seconds until next check-in (0 if can check in)
     */
    function canCheckIn(address user) external view returns (bool canCheck, uint256 timeRemaining) {
        uint256 nextCheckIn = lastCheckIn[user] + COOLDOWN;
        if (block.timestamp >= nextCheckIn) {
            return (true, 0);
        }
        return (false, nextCheckIn - block.timestamp);
    }

    /**
     * @notice Get user's check-in stats
     * @param user Address to query
     * @return last Timestamp of last check-in
     * @return total Total number of check-ins
     */
    function getUserStats(address user) external view returns (uint256 last, uint256 total) {
        return (lastCheckIn[user], totalCheckIns[user]);
    }
}
