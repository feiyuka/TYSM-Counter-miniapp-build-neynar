import { useCallback } from "react";
import { publicConfig } from "@/config/public-config";

export type ShareOptions = {
  /**
   * Custom text for the cast. If not provided, uses the app name.
   */
  text?: string;
  /**
   * Custom URL path to append to the app's home URL.
   */
  path?: string;
  /**
   * Query parameters to append to the share URL.
   */
  queryParams?: Record<string, string>;
  /**
   * Additional embed URL.
   */
  additionalEmbed?: string;
  /**
   * Whether to close the mini app after sharing.
   * @default false
   */
  close?: boolean;
  /**
   * Channel key to post to.
   */
  channelKey?: string;
};

export type ShareResult = {
  /** Hash of the created cast, or null if user cancelled */
  castHash: string | null;
};

/**
 * Hook for sharing the app — Base App compatible.
 * Uses window.open with Warpcast compose URL (no Farcaster SDK required).
 */
export function useShare() {
  const share = useCallback(
    async (options: ShareOptions = {}): Promise<ShareResult> => {
      const {
        text = `Check out ${publicConfig.name}!`,
        path,
        queryParams,
        additionalEmbed,
      } = options;

      // Build the share URL
      let shareUrl = path
        ? `${publicConfig.homeUrl}${path.startsWith("/") ? path : `/${path}`}`
        : publicConfig.homeUrl;

      // Append query params for personalized share images
      if (queryParams && Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams({
          ...queryParams,
          personalize: "true",
        });
        shareUrl = `${shareUrl}?${searchParams.toString()}`;
      }

      // Build full share text with URL embedded
      const shareText = additionalEmbed
        ? `${text}\n${shareUrl}\n${additionalEmbed}`
        : `${text}\n${shareUrl}`;

      // Open Warpcast compose — works in both Farcaster and Base App
      window.open(
        `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`,
        "_blank",
      );

      return { castHash: null };
    },
    [],
  );

  return { share };
}
