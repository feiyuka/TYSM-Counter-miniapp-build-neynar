'use client';

import { useState } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useTrendingGlobalFeed, useFrameCatalog } from '@/neynar-web-sdk/src/neynar/api-hooks';
import { useCoinsMarkets } from '@/neynar-web-sdk/src/coingecko/api-hooks';
import { useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast, FrameV2WithFullAuthor } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

type FeedSection = 'casts' | 'tokens' | 'apps';

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
  const { data, isLoading, fetchNextPage, hasNextPage } = useTrendingGlobalFeed(
    { time_window: '24h' },
    {
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
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
        <P className="text-xs opacity-40 mt-1">Check back in a few minutes</P>
      </div>
    );
  }

  const openCast = (cast: Cast) => {
    window.open(`https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {casts.slice(0, 20).map((cast, index) => (
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

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-2 text-center text-sm text-purple-400 hover:text-purple-300"
        >
          Load more...
        </button>
      )}

      <div className="text-center pt-2">
        <P className="text-xs opacity-50">🔄 Auto-refreshes every 5 minutes</P>
      </div>
    </div>
  );
}

// Trending Tokens Section - Base Network tokens with logos
function TrendingTokensSection() {
  // Fetch Base ecosystem tokens, sorted by market cap
  const { data, isLoading, fetchNextPage, hasNextPage } = useCoinsMarkets(
    {
      vs_currency: 'usd',
      category: 'base-ecosystem', // Filter to Base Network tokens only
      order: 'market_cap_desc',
      per_page: 100, // Get top 100
      sparkline: false,
      price_change_percentage: '24h',
    },
    {
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      staleTime: 2 * 60 * 1000,
    }
  );

  const coins = data?.pages?.flat() || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-16" />
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-700 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="text-center py-8">
        <P className="text-4xl mb-2">🪙</P>
        <P className="opacity-60">No Base tokens found</P>
        <P className="text-xs opacity-40 mt-1">Try again later</P>
      </div>
    );
  }

  const openToken = (coinId: string) => {
    window.open(`https://www.coingecko.com/en/coins/${coinId}`, '_blank');
  };

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

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2 text-xs opacity-50 mb-2">
        <span>Token</span>
        <span>Price / 24h</span>
      </div>

      {coins.slice(0, 100).map((coin, index) => (
        <button
          key={`${coin.id}-${index}`}
          onClick={() => openToken(coin.id)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-amber-500/20 transition-colors border border-gray-700 hover:border-amber-500/50"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {coin.image ? (
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
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
                {coin.market_cap && (
                  <P className="text-xs opacity-40">MCap: {formatMarketCap(coin.market_cap)}</P>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <P className="font-medium">{formatPrice(coin.current_price)}</P>
              <P className={`text-xs font-medium ${
                (coin.price_change_percentage_24h || 0) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(coin.price_change_percentage_24h || 0) >= 0 ? '↑' : '↓'}
                {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
              </P>
            </div>
          </div>
        </button>
      ))}

      {hasNextPage && coins.length < 100 && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-2 text-center text-sm text-amber-400 hover:text-amber-300"
        >
          Load more...
        </button>
      )}

      <div className="text-center pt-2">
        <P className="text-xs opacity-50">
          <span className="text-blue-400">Base Network</span> • CoinGecko • 🔄 Auto-refresh 5min
        </P>
      </div>
    </div>
  );
}

// Trending Mini Apps Section - with logos and 24h filter
function TrendingAppsSection() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useFrameCatalog(
    { category: undefined },
    {
      staleTime: 5 * 60 * 1000,
      refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    }
  );
  const frames = data?.pages?.flatMap(p => p.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-28 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-36" />
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
        <P className="text-xs opacity-40 mt-1">Check back later</P>
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
      {frames.slice(0, 20).map((frame, index) => (
        <button
          key={`${frame.frames_url}-${index}`}
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

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-2 text-center text-sm text-blue-400 hover:text-blue-300"
        >
          Load more...
        </button>
      )}

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
            <P className="text-xs opacity-60 mt-1">Fresh content • Auto-updates every few minutes</P>
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
                <P className="text-xs text-purple-400">Last 24 hours</P>
              </div>
              <TrendingCastsSection />
            </>
          )}

          {activeSection === 'tokens' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <H6>🪙 Base Network Tokens</H6>
                <P className="text-xs text-amber-400">Top 100</P>
              </div>
              <TrendingTokensSection />
            </>
          )}

          {activeSection === 'apps' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <H6>📱 Trending Mini Apps</H6>
                <P className="text-xs text-blue-400">Farcaster</P>
              </div>
              <TrendingAppsSection />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
