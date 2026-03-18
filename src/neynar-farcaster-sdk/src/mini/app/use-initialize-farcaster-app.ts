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
 * Initialize app and populate user atoms.
 *
 * Base App compatible — no Farcaster SDK required.
 * `sdk.actions.ready()` is not needed: the app is ready when it loads.
 * User identity comes from wagmi `useAccount` (wallet address).
 *
 * Kept for backward compatibility with useFarcasterUser() hook.
 * When running in Farcaster/Warpcast, SDK context is loaded if available.
 * When running in Base App, user context is null (guest) — use useAccount instead.
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
      // Base App: app is ready when it loads — no sdk.actions.ready() needed
      setSdkReady(true);

      // Try to load Farcaster user context (Warpcast only)
      // In Base App this will gracefully return null
      try {
        setFarcasterUserLoading(true);
        setFarcasterUserError(null);

        // Dynamic import so it doesn't crash in Base App environment
        const { default: sdk } = await import("@farcaster/miniapp-sdk").catch(
          () => ({ default: null }),
        );

        if (sdk) {
          const context = await sdk.context;
          if (context?.user) {
            setFarcasterUser(context.user);
          } else {
            console.info(
              "No Farcaster user context — running in Base App or guest mode",
            );
          }
        }
      } catch (error) {
        // Silently handle — not an error in Base App context
        console.info("Farcaster context not available:", error);
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
