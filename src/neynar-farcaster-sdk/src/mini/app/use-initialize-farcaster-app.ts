"use client";
import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import {
  farcasterUserAtom,
  farcasterUserLoadingAtom,
  farcasterUserErrorAtom,
  sdkReadyAtom,
} from "./farcaster-app-atoms";

/**
 * Initialize app — dual compatible: Warpcast + Base App.
 *
 * Base App migration (April 9, 2026):
 * - sdk.actions.ready() is NOT needed — removed per Base App migration docs
 * - In Base App: no Farcaster user context → use wagmi useAccount() for identity
 * - In Warpcast: loads FID + user from Farcaster SDK context
 *
 * Identity strategy:
 * - Farcaster/Warpcast: farcasterUser.fid (real FID)
 * - Base App: wallet address from useAccount() (no FID)
 */
export function useInitializeFarcasterApp() {
  const setFarcasterUser = useSetAtom(farcasterUserAtom);
  const setFarcasterUserLoading = useSetAtom(farcasterUserLoadingAtom);
  const setFarcasterUserError = useSetAtom(farcasterUserErrorAtom);
  const setSdkReady = useSetAtom(sdkReadyAtom);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    async function initialize() {
      // Mark SDK as ready immediately — no sdk.actions.ready() needed
      // Per Base App migration docs: "Not needed. Your app is ready to display when it loads."
      setSdkReady(true);

      // Try to load Farcaster user context (Warpcast only)
      // In Base App: context is null → identity comes from wagmi useAccount()
      try {
        setFarcasterUserLoading(true);
        setFarcasterUserError(null);

        // Dynamic import to avoid crashing in Base App where SDK may not be initialized
        const { default: sdk } = await import("@farcaster/miniapp-sdk");
        const context = await Promise.race([
          sdk.context,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);

        if (context && typeof context === "object" && "user" in context && context.user) {
          setFarcasterUser(context.user as Parameters<typeof setFarcasterUser>[0]);
        } else {
          // Base App or guest — identity from wallet address via useAccount()
          console.info("[TYSM] No Farcaster context — Base App or browser mode");
        }
      } catch {
        // Not in Farcaster — normal for Base App
        console.info("[TYSM] Farcaster SDK not available — running in Base App mode");
        setFarcasterUserError(null);
      } finally {
        setFarcasterUserLoading(false);
      }
    }

    initialize();
  }, [
    setFarcasterUser,
    setFarcasterUserLoading,
    setFarcasterUserError,
    setSdkReady,
  ]);
}
