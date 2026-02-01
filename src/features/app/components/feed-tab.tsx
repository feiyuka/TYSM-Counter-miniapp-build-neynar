'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useTrendingGlobalFeed, useFrameCatalog } from '@/neynar-web-sdk/src/neynar/api-hooks';
import { useOnchainNetworkTrendingPools, useOnchainTokensRecentlyUpdated } from '@/neynar-web-sdk/src/coingecko/api-hooks';
import { useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast, FrameV2WithFullAuthor } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

type FeedSection = 'casts' | 'tokens' | 'apps';
type TokenSubTab = 'trending' | 'new';

// Detect if running inside Farcaster app (Warpcast) or Base app
function usePlatformDetection() {
  const [platform, setPlatform] = useState<'farcaster' | 'base' | 'browser'>('browser');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isInIframe = window !== window.parent;

    // Check for Farcaster/Warpcast
    if (userAgent.includes('warpcast') ||
        userAgent.includes('farcaster') ||
        document.referrer.includes('warpcast.com') ||
        document.referrer.includes('farcaster')) {
      setPlatform('farcaster');
    }
    // Check for Base app
    else if (userAgent.includes('base') ||
             document.referrer.includes('base.org') ||
             document.referrer.includes('wallet.coinbase.com')) {
      setPlatform('base');
    }
    // If in iframe, likely a mini app context - default to farcaster
    else if (isInIframe) {
      setPlatform('farcaster');
    }
  }, []);

  return platform;
}

// Generate swap/buy URL based on platform and token address
function getTokenActionUrl(tokenAddress: string, platform: 'farcaster' | 'base' | 'browser'): string {
  // Base network chain ID
  const baseChainId = 8453;

  switch (platform) {
    case 'farcaster':
      // Farcaster Wallet swap URL (uses Uniswap under the hood)
      // Format: https://warpcast.com/~/swap?token=<address>&chain=<chainId>
      return `https://warpcast.com/~/swap?token=${tokenAddress}&chain=${baseChainId}`;

    case 'base':
      // Base app / Coinbase Wallet - use Coinbase Commerce or direct swap
      // Format: https://wallet.coinbase.com/swap?outputCurrency=<address>&chain=base
      return `https://wallet.coinbase.com/swap?outputCurrency=${tokenAddress}&chain=base`;

    default:
      // Fallback to GeckoTerminal for browser users
      return `https://www.geckoterminal.com/base/tokens/${tokenAddress}`;
  }
}

// Get action button label based on platform
function getTokenActionLabel(platform: 'farcaster' | 'base' | 'browser'): string {
  switch (platform) {
    case 'farcaster':
      return 'Swap';
    case 'base':
      return 'Buy';
    default:
      return 'View';
  }
}

// User Avatar Component for casts - fetches real-time photo
function CastAuthorAvatar({ fid, pfpUrl }: { fid: number; pfpUrl?: string }) {
  const { data: userData } = useUser(fid);
  const fallbackUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${fid}`;
  const imageUrl = userData?.pfp_url || pfpUrl || fallbackUrl;

  return (
    <img
      src={imageUrl}
      alt="Author"
      className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-purple-500/30"
    />
  );
}

// Trending Casts Section - 24h trending with auto-refresh
function TrendingCastsSection() {
  const { data, isLoading } = useTrendingGlobalFeed(
    { time_window: '24h' },
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
    }
  );
  const casts = data?.pages?.flatMap(p => p.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-28 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-20" />
              </div>
            </div>
            <div className="h-16 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="text-center py-8">
        <P className="text-4xl mb-2">📡</P>
        <P className="opacity-60">No trending casts right now</P>
      </div>
    );
  }

  const openCast = (cast: Cast) => {
    window.open(`https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {casts.slice(0, 10).map((cast, index) => (
        <button
          key={cast.hash}
          onClick={() => openCast(cast)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-purple-500/20 transition-colors border border-gray-700 hover:border-purple-500/50"
        >
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <CastAuthorAvatar fid={cast.author.fid} pfpUrl={cast.author.pfp_url} />
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                  <P className="font-medium text-sm truncate">{cast.author.display_name || cast.author.username}</P>
                  <P className="text-xs opacity-50">@{cast.author.username}</P>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-pink-400">❤️ {cast.reactions?.likes_count || 0}</span>
                    <span className="text-blue-400">🔄 {cast.reactions?.recasts_count || 0}</span>
                  </div>
                </div>
              </div>
              <P className="text-sm opacity-80 line-clamp-3">{cast.text}</P>
            </div>
          </div>
        </button>
      ))}
      <div className="text-center pt-2">
        <P className="text-xs opacity-50">🔄 Auto-refreshes every 5 minutes</P>
      </div>
    </div>
  );
}

// Helper functions for formatting
const formatPrice = (price: number | string | undefined) => {
  if (!price) return '$0.00';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '$0.00';
  if (numPrice < 0.0001) return `$${numPrice.toExponential(2)}`;
  if (numPrice < 1) return `$${numPrice.toFixed(6)}`;
  if (numPrice < 1000) return `$${numPrice.toFixed(2)}`;
  return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatMarketCap = (cap: number | string | undefined) => {
  if (!cap) return 'N/A';
  const numCap = typeof cap === 'string' ? parseFloat(cap) : cap;
  if (isNaN(numCap)) return 'N/A';
  if (numCap >= 1_000_000_000) return `$${(numCap / 1_000_000_000).toFixed(2)}B`;
  if (numCap >= 1_000_000) return `$${(numCap / 1_000_000).toFixed(2)}M`;
  if (numCap >= 1_000) return `$${(numCap / 1_000).toFixed(2)}K`;
  return `$${numCap.toFixed(2)}`;
};

// Helper to extract token data from GeckoTerminal pool response
interface TokenInfo {
  name: string;
  symbol: string;
  image: string | null;
  price: string | null;
  priceChange24h: number | null;
  address: string | null;
}

function extractBaseToken(pool: any, included?: any[]): TokenInfo {
  const attrs = pool.attributes || pool;

  // Get token relationship ID
  const baseTokenId = pool.relationships?.base_token?.data?.id;

  // Try to find token in included array
  let tokenData: any = null;
  if (included && baseTokenId) {
    tokenData = included.find((item: any) => item.id === baseTokenId && item.type === 'token');
  }

  // Extract name - multiple fallbacks
  const name = tokenData?.attributes?.name ||
               attrs.base_token_name ||
               attrs.name?.split('/')[0]?.trim() ||
               'Unknown';

  // Extract symbol
  const symbol = tokenData?.attributes?.symbol ||
                 attrs.base_token_symbol ||
                 name.split(' ')[0] ||
                 '?';

  // Extract image - GeckoTerminal provides image_url in token attributes
  const image = tokenData?.attributes?.image_url || null;

  // Extract price
  const price = attrs.base_token_price_usd || null;

  // Extract 24h price change
  const priceChange24h = attrs.price_change_percentage?.h24
    ? parseFloat(attrs.price_change_percentage.h24)
    : null;

  // Extract address
  const address = tokenData?.attributes?.address ||
                  attrs.base_token_address ||
                  baseTokenId?.split('_')[1] ||
                  null;

  return { name, symbol, image, price, priceChange24h, address };
}

// Trending Tokens on Base - Using GeckoTerminal trending pools
function TrendingTokensList() {
  const platform = usePlatformDetection();
  const actionLabel = getTokenActionLabel(platform);

  const { data, isLoading, error } = useOnchainNetworkTrendingPools(
    'base',
    { per_page: 50, duration: '24h' },  // Increased to find more tokens with logos
    {
      refetchInterval: 3 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Extract pools and included data
  const rawData = data as any;
  const pools = rawData?.data || [];
  const included = rawData?.included || [];

  // Track seen tokens to avoid duplicates (by symbol)
  const seenSymbols = new Set<string>();
  const uniqueTokens: { pool: any; token: TokenInfo }[] = [];

  for (const pool of pools) {
    const token = extractBaseToken(pool, included);
    const symbolLower = token.symbol.toLowerCase();

    // Skip tokens without logos - user requirement: no logo = not in list
    if (!token.image) continue;

    // Skip stablecoins and wrapped tokens
    if (['usdc', 'usdt', 'dai', 'weth', 'eth', 'usd+', 'usdb'].includes(symbolLower)) continue;

    // Skip if we've already seen this token
    if (seenSymbols.has(symbolLower)) continue;

    seenSymbols.add(symbolLower);
    uniqueTokens.push({ pool, token });

    if (uniqueTokens.length >= 10) break;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">⚠️</P>
        <P className="opacity-60 text-sm">Error loading trending tokens</P>
        <P className="text-xs opacity-40 mt-1">{errorMsg}</P>
      </div>
    );
  }

  if (uniqueTokens.length === 0) {
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">🔥</P>
        <P className="opacity-60 text-sm">No trending tokens with logos found</P>
        <P className="text-xs opacity-40 mt-1">Only tokens with verified logos are shown</P>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {uniqueTokens.map(({ pool, token }, index) => {
        const tokenAddress = token.address;

        const openToken = () => {
          if (tokenAddress) {
            const url = getTokenActionUrl(tokenAddress, platform);
            window.open(url, '_blank');
          }
        };

        return (
          <button
            key={pool.id || index}
            onClick={openToken}
            className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-amber-500/20 transition-colors border border-gray-700 hover:border-amber-500/50"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={token.image!}
                  alt={token.symbol}
                  className="w-10 h-10 rounded-full object-cover border border-amber-500/30"
                />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center text-black">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <P className="font-medium truncate">{token.name}</P>
                <P className="text-xs text-amber-400 uppercase">{token.symbol}</P>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex flex-col items-end gap-1">
                  {token.price && (
                    <P className="font-medium text-sm">{formatPrice(token.price)}</P>
                  )}
                  {token.priceChange24h !== null && (
                    <P className={`text-xs font-medium ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.priceChange24h >= 0 ? '↑' : '↓'}
                      {Math.abs(token.priceChange24h).toFixed(2)}%
                    </P>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded mt-1 inline-block ${
                  platform === 'farcaster' ? 'bg-purple-500/20 text-purple-400' :
                  platform === 'base' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {actionLabel}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// New Tokens - Recently updated tokens on Base with logos
function NewTokensList() {
  const platform = usePlatformDetection();
  const actionLabel = getTokenActionLabel(platform);

  const { data, isLoading, error } = useOnchainTokensRecentlyUpdated(
    { network: 'base' },
    {
      refetchInterval: 2 * 60 * 1000,
      staleTime: 1 * 60 * 1000,
    }
  );

  // Extract tokens from response
  const rawData = data as any;
  const tokens = rawData?.data || [];

  // Filter tokens with logos and on Base network
  const seenSymbols = new Set<string>();
  const uniqueTokens: any[] = [];

  for (const token of tokens) {
    const attrs = token.attributes || token;
    const symbol = attrs.symbol || '';
    const symbolLower = symbol.toLowerCase();
    const imageUrl = attrs.image_url || null;
    const network = token.relationships?.network?.data?.id || attrs.network || '';

    // Skip tokens without logos - user requirement
    if (!imageUrl) continue;

    // Only Base network tokens
    if (network && network !== 'base') continue;

    // Skip stablecoins and wrapped
    if (['usdc', 'usdt', 'dai', 'weth', 'eth', 'usd+', 'usdb'].includes(symbolLower)) continue;

    // Skip duplicates
    if (seenSymbols.has(symbolLower)) continue;

    seenSymbols.add(symbolLower);
    uniqueTokens.push(token);

    if (uniqueTokens.length >= 10) break;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-28 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">⚠️</P>
        <P className="opacity-60 text-sm">Error loading new tokens</P>
      </div>
    );
  }

  if (uniqueTokens.length === 0) {
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">✨</P>
        <P className="opacity-60 text-sm">No new tokens with logos found</P>
        <P className="text-xs opacity-40 mt-1">Only tokens with verified logos are shown</P>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {uniqueTokens.map((token, index) => {
        const attrs = token.attributes || token;
        const name = attrs.name || 'Unknown';
        const symbol = attrs.symbol || '???';
        const imageUrl = attrs.image_url;
        const address = attrs.address || token.id?.split('_')[1];
        const priceUsd = parseFloat(attrs.price_usd || '0');

        const openToken = () => {
          if (address) {
            const url = getTokenActionUrl(address, platform);
            window.open(url, '_blank');
          }
        };

        return (
          <button
            key={token.id || index}
            onClick={openToken}
            className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-green-500/20 transition-colors border border-gray-700 hover:border-green-500/50"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={symbol}
                  className="w-10 h-10 rounded-full object-cover border border-green-500/30"
                />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-[10px] font-bold flex items-center justify-center text-black">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <P className="font-medium truncate text-sm">{name}</P>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">NEW</span>
                  <P className="text-xs text-green-400 uppercase">{symbol}</P>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {priceUsd > 0 && (
                  <P className="text-xs opacity-60">{formatPrice(priceUsd)}</P>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded mt-1 inline-block ${
                  platform === 'farcaster' ? 'bg-purple-500/20 text-purple-400' :
                  platform === 'base' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {actionLabel}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Tokens Section with sub-tabs
function TokensSection() {
  const [subTab, setSubTab] = useState<TokenSubTab>('trending');

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSubTab('trending')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            subTab === 'trending'
              ? 'bg-amber-500 text-black'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🔥 Trending
        </button>
        <button
          onClick={() => setSubTab('new')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            subTab === 'new'
              ? 'bg-green-500 text-black'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ✨ New on Base
        </button>
      </div>

      {/* Content */}
      {subTab === 'trending' ? <TrendingTokensList /> : <NewTokensList />}

      <div className="text-center pt-2">
        <P className="text-xs opacity-50">
          Base Network via GeckoTerminal • 🔄 Auto-refresh
        </P>
      </div>
    </div>
  );
}

// Trending Mini Apps Section
function TrendingAppsSection() {
  const { data, isLoading } = useFrameCatalog(
    { category: undefined },
    {
      staleTime: 5 * 60 * 1000,
      refetchInterval: 10 * 60 * 1000,
    }
  );
  const allFrames = data?.pages?.flatMap(p => p.items) || [];

  // Remove duplicates by frames_url
  const seenUrls = new Set<string>();
  const frames = allFrames.filter(frame => {
    if (!frame.frames_url || seenUrls.has(frame.frames_url)) return false;
    seenUrls.add(frame.frames_url);
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-28 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="text-center py-8">
        <P className="text-4xl mb-2">📱</P>
        <P className="opacity-60">No trending mini apps right now</P>
      </div>
    );
  }

  const openApp = (frame: FrameV2WithFullAuthor) => {
    if (frame.frames_url) {
      window.open(frame.frames_url, '_blank');
    }
  };

  // Helper to get app name - correct structure: manifest.frame.name (snake_case)
  const getAppName = (frame: FrameV2WithFullAuthor): string => {
    const manifest = frame.manifest as any;
    const manifestFrame = manifest?.frame;

    // 1. manifest.frame.name (the correct path!)
    if (manifestFrame?.name && manifestFrame.name.trim()) {
      return manifestFrame.name;
    }

    // 2. Button title from frame
    if (frame.title && frame.title.trim()) return frame.title;

    // 3. manifest.frame.button_title
    if (manifestFrame?.button_title && manifestFrame.button_title.trim()) {
      return manifestFrame.button_title;
    }

    // 4. Extract from URL
    try {
      const url = new URL(frame.frames_url);
      const hostname = url.hostname
        .replace('www.', '')
        .replace('.vercel.app', '')
        .replace('.netlify.app', '')
        .replace('.pages.dev', '')
        .replace('.com', '')
        .replace('.xyz', '')
        .replace('.io', '')
        .split('.')[0];
      if (hostname.length > 2) {
        return hostname.charAt(0).toUpperCase() + hostname.slice(1);
      }
    } catch {
      // ignore
    }

    // 5. Author's app
    if (frame.author?.display_name) return `${frame.author.display_name}'s App`;

    return 'Mini App';
  };

  // Helper to get app icon - correct structure: manifest.frame.icon_url (snake_case)
  const getAppIcon = (frame: FrameV2WithFullAuthor): string | null => {
    const manifest = frame.manifest as any;
    const manifestFrame = manifest?.frame;

    // 1. manifest.frame.icon_url (the correct path!)
    if (manifestFrame?.icon_url) return manifestFrame.icon_url;

    // 2. manifest.frame.splash_image_url
    if (manifestFrame?.splash_image_url) return manifestFrame.splash_image_url;

    // 3. manifest.frame.image_url
    if (manifestFrame?.image_url) return manifestFrame.image_url;

    // 4. Frame preview image (og:image)
    if (frame.image && frame.image.trim()) return frame.image;

    return null;
  };

  return (
    <div className="space-y-3">
      {frames.slice(0, 10).map((frame, index) => {
        const appName = getAppName(frame);
        const appIcon = getAppIcon(frame);

        return (
          <button
            key={frame.frames_url}
            onClick={() => openApp(frame)}
            className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-blue-500/20 transition-colors border border-gray-700 hover:border-blue-500/50"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                {appIcon ? (
                  <img
                    src={appIcon}
                    alt={appName}
                    className="w-12 h-12 rounded-xl object-cover border border-blue-500/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl ${appIcon ? 'hidden' : ''}`}>
                  📱
                </div>
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 text-[10px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <P className="font-medium truncate">{appName}</P>
                {frame.author && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {frame.author.pfp_url && (
                      <img
                        src={frame.author.pfp_url}
                        alt={frame.author.username || 'author'}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <P className="text-xs text-blue-400 truncate">@{frame.author.username}</P>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
      <div className="text-center pt-2">
        <P className="text-xs opacity-50">Farcaster Mini Apps • 🔄 Auto-refresh 10min</P>
      </div>
    </div>
  );
}

export function FeedTab() {
  const [activeSection, setActiveSection] = useState<FeedSection>('casts');

  const sections = [
    { id: 'casts' as FeedSection, label: '🔥 Casts', color: 'purple' },
    { id: 'tokens' as FeedSection, label: '🪙 Tokens', color: 'amber' },
    { id: 'apps' as FeedSection, label: '📱 Apps', color: 'blue' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-purple-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <H6>📰 Trending Now</H6>
            <P className="text-xs opacity-60 mt-1">Fresh content • Auto-updates</P>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? section.color === 'purple'
                      ? 'bg-purple-500 text-white'
                      : section.color === 'amber'
                      ? 'bg-amber-500 text-black'
                      : 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Section */}
      <Card className={`rounded-xl ${
        activeSection === 'casts'
          ? 'border border-purple-400/70'
          : activeSection === 'tokens'
          ? 'border border-amber-400/70'
          : 'border border-blue-400/70'
      }`}>
        <CardContent className="p-4">
          {activeSection === 'casts' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <H6>🔥 Trending Casts</H6>
                <P className="text-xs text-purple-400">Top 10 • 24h</P>
              </div>
              <TrendingCastsSection />
            </>
          )}

          {activeSection === 'tokens' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <H6>🪙 Base Tokens</H6>
                <P className="text-xs text-amber-400">GeckoTerminal</P>
              </div>
              <TokensSection />
            </>
          )}

          {activeSection === 'apps' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <H6>📱 Mini Apps</H6>
                <P className="text-xs text-blue-400">Top 10</P>
              </div>
              <TrendingAppsSection />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
