import "server-only";
import { z } from "zod";

const privateConfigSchema = z.object({
  neynarApiKey: z
    .string()
    .min(1, "NEYNAR_API_KEY environment variable is required"),
  neynarWalletId: z
    .string()
    .min(1, "NEYNAR_WALLET_ID environment variable is required"),
  notifySecret: z
    .string()
    .min(1, "NOTIFY_SECRET environment variable is required"),
  coingeckoApiKey: z.string(),
});

export const privateConfig = privateConfigSchema.parse({
  neynarApiKey: process.env.NEYNAR_API_KEY || "",
  neynarWalletId: process.env.NEYNAR_WALLET_ID || "",
  notifySecret: process.env.NOTIFY_SECRET || "tysm-notify-secret",
  coingeckoApiKey:
    // demo coingecko key, not sensitive
    process.env.COINGECKO_API_KEY || "CG-UviYfmkExfr86X5JFTZfaVbb",
});
