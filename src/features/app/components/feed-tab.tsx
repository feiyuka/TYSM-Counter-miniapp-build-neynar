'use client';

import { useState } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useTrendingGlobalFeed, useFrameCatalog } from '@/neynar-web-sdk/src/neynar/api-hooks';
import { useCoinsMarkets, useOnchainNetworkNewPools } from '@/neynar-web-sdk/src/coingecko/api-hooks';
import { useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast, FrameV2WithFullAuthor } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

type FeedSection = 'casts' | 'tokens' | 'apps';
type TokenSubTab = 'trending' | 'new';

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

// Helper functions for token formatting
const formatPrice = (price: number | undefined) => {
  if (!price) return '$0.00';
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatMarketCap = (cap: number | undefined) => {
  if (!cap) return 'N/A';
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
  if (cap >= 1_000) return `$${(cap / 1_000).toFixed(2)}K`;
  return `$${cap.toFixed(2)}`;
};

// Trending Tokens - Top 10 most trending in 24h
function TrendingTokensList() {
  const { data, isLoading } = useCoinsMarkets(
    {
      vs_currency: 'usd',
      category: 'base-ecosystem',
      order: 'volume_desc', // Sort by volume for trending
      per_page: 10,
      sparkline: false,
      price_change_percentage: '24h',
    },
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
    }
  );

  const coins = data?.pages?.flat() || [];

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

  if (coins.length === 0) {
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">🪙</P>
        <P className="opacity-60 text-sm">No trending tokens</P>
      </div>
    );
  }

  const openToken = (coinId: string) => {
    window.open(`https://www.coingecko.com/en/coins/${coinId}`, '_blank');
  };

  return (
    <div className="space-y-2">
      {coins.slice(0, 10).map((coin, index) => (
        <button
          key={coin.id}
          onClick={() => openToken(coin.id)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-amber-500/20 transition-colors border border-gray-700 hover:border-amber-500/50"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {coin.image ? (
                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg font-bold">
                  {coin.symbol?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center text-black">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <P className="font-medium truncate">{coin.name}</P>
              <div className="flex items-center gap-2">
                <P className="text-xs text-amber-400 uppercase">{coin.symbol}</P>
                <P className="text-xs opacity-40">MCap: {formatMarketCap(coin.market_cap)}</P>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <P className="font-medium text-sm">{formatPrice(coin.current_price)}</P>
              <P className={`text-xs font-medium ${(coin.price_change_percentage_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(coin.price_change_percentage_24h || 0) >= 0 ? '↑' : '↓'}
                {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
              </P>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// New Tokens on Base - Recently created pools
function NewTokensList() {
  const { data, isLoading } = useOnchainNetworkNewPools('base', { per_page: 10 }, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const pools = data || [];

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

  if (pools.length === 0) {
    return (
      <div className="text-center py-6">
        <P className="text-3xl mb-2">✨</P>
        <P className="opacity-60 text-sm">No new tokens found</P>
      </div>
    );
  }

  const openPool = (pool: typeof pools[0]) => {
    if (pool.address) {
      window.open(`https://www.geckoterminal.com/base/pools/${pool.address}`, '_blank');
    }
  };

  return (
    <div className="space-y-2">
      {pools.slice(0, 10).map((pool, index) => (
        <button
          key={`${pool.address}-${index}`}
          onClick={() => openPool(pool)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-green-500/20 transition-colors border border-gray-700 hover:border-green-500/50"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-sm font-bold">
                {pool.name?.split('/')[0]?.charAt(0) || '?'}
              </div>
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-[10px] font-bold flex items-center justify-center text-black">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <P className="font-medium truncate text-sm">{pool.name || 'Unknown Pool'}</P>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">NEW</span>
                <P className="text-xs opacity-40 truncate">{pool.dex_id || 'DEX'}</P>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {pool.reserve_in_usd && (
                <P className="text-xs opacity-60">TVL: {formatMarketCap(pool.reserve_in_usd)}</P>
              )}
            </div>
          </div>
        </button>
      ))}
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
          ✨ New
        </button>
      </div>

      {/* Content */}
      {subTab === 'trending' ? <TrendingTokensList /> : <NewTokensList />}

      <div className="text-center pt-2">
        <P className="text-xs opacity-50">
          <span className="text-blue-400">Base Network</span> • CoinGecko • 🔄 Auto-refresh 5min
        </P>
      </div>
    </div>
  );
}

// Trending Mini Apps Section - 10 apps, no duplicates
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

  return (
    <div className="space-y-3">
      {frames.slice(0, 10).map((frame, index) => (
        <button
          key={frame.frames_url}
          onClick={() => openApp(frame)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-blue-500/20 transition-colors border border-gray-700 hover:border-blue-500/50"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {frame.image ? (
                <img
                  src={frame.image}
                  alt={frame.title || 'App'}
                  className="w-12 h-12 rounded-xl object-cover border border-blue-500/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                  📱
                </div>
              )}
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 text-[10px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <P className="font-medium truncate">{frame.title || 'Untitled App'}</P>
              {frame.author && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {frame.author.pfp_url && (
                    <img
                      src={frame.author.pfp_url}
                      alt={frame.author.username}
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <P className="text-xs text-blue-400 truncate">@{frame.author.username}</P>
                </div>
              )}
              {frame.metadata?.description && (
                <P className="text-xs opacity-50 line-clamp-1 mt-0.5">{frame.metadata.description}</P>
              )}
            </div>
          </div>
        </button>
      ))}
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
    { id: 'tokens' as FeedSection, label: '🪙 Base', color: 'amber' },
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
                <P className="text-xs text-amber-400">Top 10</P>
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
