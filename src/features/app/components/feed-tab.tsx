'use client';

import { useState } from 'react';
import { Card, CardContent, H6, P } from '@neynar/ui';
import { useTrendingGlobalFeed, useFrameCatalog, useUser } from '@/neynar-web-sdk/src/neynar/api-hooks';
import type { Cast, FrameV2WithFullAuthor } from '@/neynar-web-sdk/src/neynar/api-hooks/sdk-response-types';
type FeedSection = 'casts' | 'apps';

// Type for frame manifest structure
interface FrameManifest {
  frame?: {
    name?: string;
    button_title?: string;
    icon_url?: string;
    splash_image_url?: string;
    image_url?: string;
  };
}

// User Avatar Component for casts - fetches real-time photo
function CastAuthorAvatar({ fid, pfpUrl }: { fid: number; pfpUrl?: string }) {
  const { data: userData } = useUser(fid);
  const fallbackUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${fid}`;
  const imageUrl = userData?.pfp_url || pfpUrl || fallbackUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
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
    const manifest = frame.manifest as FrameManifest;
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
    const manifest = frame.manifest as FrameManifest;
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
                  // eslint-disable-next-line @next/next/no-img-element
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
                      // eslint-disable-next-line @next/next/no-img-element
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
