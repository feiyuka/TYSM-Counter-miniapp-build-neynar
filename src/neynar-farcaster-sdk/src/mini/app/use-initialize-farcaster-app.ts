"use client";
import sdk from "@farcaster/miniapp-sdk";
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
 * - Warpcast: sdk.actions.ready() WAJIB dipanggil agar app tidak freeze/blank
 * - Base App: sdk.actions.ready() adalah no-op, aman dipanggil
 * - Identity: gunakan wagmi useAccount() untuk wallet address di kedua platform
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
      // WAJIB untuk Warpcast — tanpa ini app blank/freeze di Farcaster
      // Di Base App ini no-op (aman)
      try {
        await sdk.actions.ready();
      } catch {
        // Base App tidak support ini — bukan error
      }

      setSdkReady(true);

      // Load Farcaster user context (Warpcast only)
      // Di Base App, context = null — gunakan useAccount() untuk identity
      try {
        setFarcasterUserLoading(true);
        setFarcasterUserError(null);

        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser(context.user);
        } else {
          console.info(
            "No Farcaster user context — running in Base App or guest mode",
          );
        }
      } catch (error) {
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
