'use client';

import { useState } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useTrendingGlobalFeed, useFrameCatalog } from '@/neynar-web-sdk/src/neynar/api-hooks';
import { useTrendingSearch } from '@/neynar-web-sdk/src/coingecko/api-hooks';
import { useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast, FrameV2WithFullAuthor } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';

type FeedSection = 'casts' | 'tokens' | 'apps';

// User Avatar Component for casts
function CastAuthorAvatar({ fid }: { fid: number }) {
  const { data: userData } = useUser(fid);
  const fallbackUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${fid}`;

  return (
    <img
      src={userData?.pfp_url || fallbackUrl}
      alt="Author"
      className="w-8 h-8 rounded-full flex-shrink-0"
    />
  );
}

// Trending Casts Section
function TrendingCastsSection() {
  const { data, isLoading } = useTrendingGlobalFeed({ time_window: '24h' });
  const casts = data?.pages?.flatMap(p => p.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700" />
              <div className="h-4 bg-gray-700 rounded w-24" />
            </div>
            <div className="h-12 bg-gray-700 rounded" />
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
      {casts.slice(0, 10).map((cast) => (
        <button
          key={cast.hash}
          onClick={() => openCast(cast)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <CastAuthorAvatar fid={cast.author.fid} />
            <div className="flex-1 min-w-0">
              <P className="font-medium text-sm truncate">{cast.author.display_name || cast.author.username}</P>
              <P className="text-xs opacity-50">@{cast.author.username}</P>
            </div>
            <div className="text-right flex-shrink-0">
              <P className="text-xs text-purple-400">❤️ {cast.reactions?.likes_count || 0}</P>
              <P className="text-xs text-blue-400">🔄 {cast.reactions?.recasts_count || 0}</P>
            </div>
          </div>
          <P className="text-sm opacity-80 line-clamp-3">{cast.text}</P>
        </button>
      ))}
    </div>
  );
}

// Trending Tokens Section (using CoinGecko)
function TrendingTokensSection() {
  const { data, isLoading } = useTrendingSearch();
  const coins = data?.coins || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-12" />
              </div>
              <div className="h-4 bg-gray-700 rounded w-16" />
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
        <P className="opacity-60">No trending tokens right now</P>
      </div>
    );
  }

  const openToken = (coinId: string) => {
    window.open(`https://www.coingecko.com/en/coins/${coinId}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {coins.slice(0, 10).map((coin, index) => (
        <button
          key={coin.id}
          onClick={() => openToken(coin.id)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {coin.thumb ? (
                <img
                  src={coin.thumb}
                  alt={coin.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg font-bold">
                  {coin.symbol?.charAt(0) || '?'}
                </div>
              )}
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <P className="font-medium truncate">{coin.name}</P>
              <P className="text-xs text-amber-400 uppercase">{coin.symbol}</P>
            </div>
            {coin.market_cap_rank && (
              <div className="text-right flex-shrink-0">
                <P className="text-xs opacity-50">Rank</P>
                <P className="text-sm font-bold text-green-400">#{coin.market_cap_rank}</P>
              </div>
            )}
          </div>
        </button>
      ))}
      <div className="text-center pt-2">
        <P className="text-xs opacity-50">Data from CoinGecko • Auto-updates every 15min</P>
      </div>
    </div>
  );
}

// Trending Mini Apps Section
function TrendingAppsSection() {
  const { data, isLoading } = useFrameCatalog({ category: undefined }, { staleTime: 5 * 60 * 1000 });
  const frames = data?.pages?.flatMap(p => p.items) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-32" />
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
          key={frame.frames_url || index}
          onClick={() => openApp(frame)}
          className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {frame.image ? (
                <img
                  src={frame.image}
                  alt={frame.title || 'App'}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                  📱
                </div>
              )}
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <P className="font-medium truncate">{frame.title || 'Untitled App'}</P>
              {frame.author && (
                <P className="text-xs text-purple-400 truncate">by @{frame.author.username}</P>
              )}
              {frame.metadata?.description && (
                <P className="text-xs opacity-50 line-clamp-1 mt-0.5">{frame.metadata.description}</P>
              )}
            </div>
          </div>
        </button>
      ))}
      <div className="text-center pt-2">
        <P className="text-xs opacity-50">Farcaster Mini Apps • Tap to open</P>
      </div>
    </div>
  );
}

export function FeedTab() {
  const [activeSection, setActiveSection] = useState<FeedSection>('casts');

  const sections = [
    { id: 'casts' as FeedSection, label: '🔥 Casts', icon: '🔥' },
    { id: 'tokens' as FeedSection, label: '🪙 Tokens', icon: '🪙' },
    { id: 'apps' as FeedSection, label: '📱 Apps', icon: '📱' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-purple-400/70 rounded-xl">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <H6>📰 Trending in 24h</H6>
            <P className="text-xs opacity-60 mt-1">See what's hot on Farcaster & Crypto</P>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-purple-500 text-white'
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
      <Card className="border border-blue-400/70 rounded-xl">
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
                <H6>🪙 Trending Tokens</H6>
                <P className="text-xs text-amber-400">Global</P>
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
