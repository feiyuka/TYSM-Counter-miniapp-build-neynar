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
 * CRITICAL: sdk.actions.ready() MUST be called in Warpcast to dismiss the
 * splash screen. Without it, Warpcast shows splash forever and app never loads.
 *
 * Base App (after April 9, 2026): sdk.actions.ready() is not needed but
 * calling it is safe — it gracefully no-ops if not in Warpcast context.
 *
 * Strategy: always try to call sdk.actions.ready(), catch silently if fails.
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
      try {
        setFarcasterUserLoading(true);
        setFarcasterUserError(null);

        // Dynamic import — safe in both Warpcast and Base App
        const { default: sdk } = await import("@farcaster/miniapp-sdk");

        // MUST call ready() in Warpcast to dismiss splash screen.
        // In Base App this is a no-op — safe to call always.
        try {
          await sdk.actions.ready();
        } catch {
          // Not in Warpcast context — fine, continue
        }

        // Mark app as ready
        setSdkReady(true);

        // Load Farcaster user context (Warpcast only)
        // In Base App: context is null → identity from wagmi useAccount()
        const context = await Promise.race([
          sdk.context,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (context && typeof context === "object" && "user" in context && context.user) {
          setFarcasterUser(context.user as Parameters<typeof setFarcasterUser>[0]);
        } else {
          console.info("[TYSM] No Farcaster context — Base App or browser mode");
        }
      } catch {
        // SDK not available — Base App or browser
        console.info("[TYSM] SDK not available — Base App mode");
        setSdkReady(true);
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
