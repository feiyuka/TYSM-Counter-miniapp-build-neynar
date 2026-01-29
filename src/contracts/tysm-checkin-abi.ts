export const TYSM_CHECKIN_ADDRESS = "0x5FFB2f5642e87721FcF722645587942475Eed7Ab" as const;

export const TYSM_TOKEN_ADDRESS = "0x0358795322C04DE04EAD2338A803A9D3518a9877" as const;

export const TYSM_CHECKIN_ABI = [
  {
    inputs: [{ name: "_tysmToken", type: "address" }, { name: "_poolWallet", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "streakDay", type: "uint256" },
      { indexed: false, name: "streakWeek", type: "uint256" },
      { indexed: false, name: "reward", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ],
    name: "CheckIn",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ],
    name: "StreakReset",
    type: "event"
  },
  {
    inputs: [],
    name: "checkIn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "canCheckIn",
    outputs: [
      { name: "canCheck", type: "bool" },
      { name: "timeRemaining", type: "uint256" },
      { name: "willReset", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserStreak",
    outputs: [
      { name: "lastCheckIn", type: "uint256" },
      { name: "streakDay", type: "uint256" },
      { name: "streakWeek", type: "uint256" },
      { name: "totalCheckIns", type: "uint256" },
      { name: "totalEarned", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "previewReward",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "poolBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "tysmToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "poolWallet",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "COOLDOWN",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "STREAK_WINDOW",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;
